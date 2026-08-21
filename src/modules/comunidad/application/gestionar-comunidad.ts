// Módulo Comunidad · APLICACIÓN · Casos de uso.

import { normalizar } from "@/modules/biblioteca/domain/documento";
import {
  estadoPregunta,
  ordenarRespuestas,
  puedeEditarPregunta,
  puedeEditarRespuesta,
  puedeValidar,
  puedeVotar,
  sinErrores,
  validarPregunta,
  validarRespuesta,
  type Pregunta,
} from "../domain/pregunta";
import type {
  Autor,
  DatosPregunta,
  FiltrosComunidad,
  PromoverAFaq,
  RepositorioComunidad,
} from "./ports";

export interface Deps {
  repo: RepositorioComunidad;
  faq?: PromoverAFaq;
}

/** El resultado uniforme de una acción de escritura. */
export type Resultado<T = void> =
  | ({ ok: true } & (T extends void ? { valor?: undefined } : { valor: T }))
  | { ok: false; error: string; errores?: Record<string, string | undefined> };

export interface VistaComunidad {
  items: Pregunta[];
  categorias: string[];
  /** Contadores del encabezado. */
  sinResponder: number;
  resueltas: number;
  total: number;
}

/** Las preguntas de la comunidad, filtradas. */
export async function listarPreguntas(
  { repo }: Deps,
  email: string,
  filtros: FiltrosComunidad = {},
): Promise<VistaComunidad> {
  let items = await repo.listar(email, filtros);

  if (filtros.busqueda?.trim()) {
    const palabras = normalizar(filtros.busqueda).split(/\s+/).filter(Boolean);
    items = items.filter((p) => {
      const heno = normalizar(
        [p.title, p.body, p.category, p.software, p.authorName, ...p.tags]
          .filter(Boolean)
          .join(" "),
      );
      return palabras.every((w) => heno.includes(w));
    });
  }

  // El estado se deriva, así que también se filtra aquí y no en el `where`.
  if (filtros.estado) {
    items = items.filter((p) => estadoPregunta(p) === filtros.estado);
  }

  const categorias = new Set<string>();
  for (const p of items) if (p.category) categorias.add(p.category);

  return {
    items,
    categorias: [...categorias].sort((a, b) => a.localeCompare(b, "es")),
    sinResponder: items.filter((p) => estadoPregunta(p) === "sin_responder").length,
    resueltas: items.filter((p) => estadoPregunta(p) === "resuelta").length,
    total: items.length,
  };
}

/** Una pregunta con sus respuestas ya ordenadas como se muestran. */
export async function verPregunta(
  { repo }: Deps,
  email: string,
  id: string,
): Promise<Pregunta | null> {
  const p = await repo.porId(email, id);
  if (!p) return null;
  return { ...p, respuestas: ordenarRespuestas(p.respuestas) };
}

/** Publicar una pregunta. */
export async function preguntar(
  { repo }: Deps,
  datos: DatosPregunta,
  autor: Autor,
): Promise<Resultado<string>> {
  const errores = validarPregunta(datos);
  if (!sinErrores(errores)) {
    return { ok: false, error: "Revisa los campos marcados.", errores };
  }

  const id = await repo.crear(
    {
      ...datos,
      title: datos.title.trim(),
      body: datos.body.trim(),
      // Las etiquetas se normalizan aquí para que "Revit" y "revit" no
      // convivan como dos etiquetas distintas en los filtros.
      tags: [...new Set((datos.tags ?? []).map((t) => t.trim()).filter(Boolean))],
    },
    autor,
  );

  return { ok: true, valor: id };
}

/** Responder a una pregunta. */
export async function responder(
  { repo }: Deps,
  preguntaId: string,
  body: string,
  autor: Autor,
): Promise<Resultado<string>> {
  const error = validarRespuesta(body);
  if (error) return { ok: false, error };

  const id = await repo.responder(preguntaId, body.trim(), autor);
  return { ok: true, valor: id };
}

/**
 * Validar una respuesta como solución (o quitarle la validación).
 *
 * Solo administración. La comprobación vive en el caso de uso y no en la
 * interfaz: esconder el botón no impide que alguien invoque la acción a mano.
 */
export async function validarComoSolucion(
  { repo }: Deps,
  respuestaId: string,
  email: string,
  esAdmin: boolean,
  validar: boolean,
): Promise<Resultado> {
  if (!puedeValidar(esAdmin)) {
    return { ok: false, error: "Solo administración puede validar respuestas." };
  }
  await repo.validarRespuesta(respuestaId, validar ? email : null);
  return { ok: true };
}

/** Votar o quitar el voto a una respuesta. */
export async function alternarVoto(
  { repo }: Deps,
  respuestaId: string,
  email: string,
): Promise<Resultado<number>> {
  const autor = await repo.autorDeRespuesta(respuestaId);
  if (!autor) return { ok: false, error: "La respuesta ya no existe." };

  if (!puedeVotar({ email: autor }, email)) {
    return { ok: false, error: "No puedes votar tu propia respuesta." };
  }

  const total = await repo.alternarVoto(respuestaId, email);
  return { ok: true, valor: total };
}

/** Comentar una respuesta. */
export async function comentar(
  { repo }: Deps,
  respuestaId: string,
  body: string,
  autor: Autor,
): Promise<Resultado<string>> {
  if (body.trim().length < 2) {
    return { ok: false, error: "El comentario está vacío." };
  }
  const id = await repo.comentar(respuestaId, body.trim(), autor);
  return { ok: true, valor: id };
}

/** Editar una respuesta: su autor o administración. */
export async function editarRespuesta(
  { repo }: Deps,
  respuestaId: string,
  body: string,
  email: string,
  esAdmin: boolean,
): Promise<Resultado> {
  const autor = await repo.autorDeRespuesta(respuestaId);
  if (!autor) return { ok: false, error: "La respuesta ya no existe." };

  if (!puedeEditarRespuesta({ email: autor }, email, esAdmin)) {
    return { ok: false, error: "Solo puedes editar tus propias respuestas." };
  }

  const error = validarRespuesta(body);
  if (error) return { ok: false, error };

  await repo.editarRespuesta(respuestaId, body.trim());
  return { ok: true };
}

/** Borrar una respuesta: su autor o administración. */
export async function eliminarRespuesta(
  { repo }: Deps,
  respuestaId: string,
  email: string,
  esAdmin: boolean,
): Promise<Resultado> {
  const autor = await repo.autorDeRespuesta(respuestaId);
  if (!autor) return { ok: true }; // Ya no está: el resultado es el deseado.

  if (!puedeEditarRespuesta({ email: autor }, email, esAdmin)) {
    return { ok: false, error: "Solo puedes borrar tus propias respuestas." };
  }

  await repo.eliminarRespuesta(respuestaId);
  return { ok: true };
}

/** Borrar una pregunta: su autor o administración. */
export async function eliminarPregunta(
  { repo }: Deps,
  email: string,
  id: string,
  esAdmin: boolean,
): Promise<Resultado> {
  const p = await repo.porId(email, id);
  if (!p) return { ok: true };

  if (!puedeEditarPregunta(p, email, esAdmin)) {
    return { ok: false, error: "Solo puedes borrar tus propias preguntas." };
  }

  await repo.eliminarPregunta(id);
  return { ok: true };
}

/**
 * Promover una pregunta resuelta a pregunta frecuente.
 *
 * Es el puente entre conversación y doctrina: cuando algo se pregunta muchas
 * veces y ya tiene una solución validada, deja de ser una charla y pasa a ser
 * la respuesta oficial de la empresa.
 *
 * Se hace a través de un PORT: Comunidad no conoce las tablas de FAQ.
 */
export async function promoverAFaq(
  { repo, faq }: Deps,
  email: string,
  preguntaId: string,
  esAdmin: boolean,
): Promise<Resultado<string>> {
  if (!esAdmin) {
    return { ok: false, error: "Solo administración puede promover a FAQ." };
  }
  if (!faq) {
    return { ok: false, error: "La promoción a FAQ no está disponible." };
  }

  const p = await repo.porId(email, preguntaId);
  if (!p) return { ok: false, error: "La pregunta ya no existe." };

  const solucion = ordenarRespuestas(p.respuestas).find((r) => r.validatedAt !== null);
  if (!solucion) {
    return { ok: false, error: "Valida una respuesta antes de promoverla a FAQ." };
  }

  const { faqId } = await faq.promover({
    preguntaId: p.id,
    category: p.category,
    question: p.title,
    answer: solucion.body,
    creadaPor: email,
  });

  return { ok: true, valor: faqId };
}
