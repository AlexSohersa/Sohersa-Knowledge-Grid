// Módulo FAQ · APLICACIÓN · Casos de uso.

import { normalizar } from "@/modules/biblioteca/domain/documento";
import {
  agruparPorCategoria,
  necesitaRevision,
  validarFaq,
  type CategoriaFaq,
  type Faq,
} from "../domain/faq";
import type { DatosFaq, FiltrosFaq, RepositorioFaq } from "./ports";

export interface Deps {
  repo: RepositorioFaq;
}

export type Resultado<T = void> =
  | ({ ok: true } & (T extends void ? { valor?: undefined } : { valor: T }))
  | { ok: false; error: string; errores?: Record<string, string | undefined> };

export interface VistaFaq {
  categorias: CategoriaFaq[];
  total: number;
  /** Las que la gente marca como poco útiles: administración debe revisarlas. */
  porRevisar: number;
}

/** Las preguntas frecuentes agrupadas por categoría. */
export async function listarFaq(
  { repo }: Deps,
  email: string,
  filtros: FiltrosFaq = {},
): Promise<VistaFaq> {
  let items = await repo.listar(email, filtros);

  if (filtros.busqueda?.trim()) {
    const palabras = normalizar(filtros.busqueda).split(/\s+/).filter(Boolean);
    items = items.filter((f) => {
      const heno = normalizar([f.question, f.answer, f.category, ...f.steps].join(" "));
      return palabras.every((p) => heno.includes(p));
    });
  }

  return {
    categorias: agruparPorCategoria(items),
    total: items.length,
    porRevisar: items.filter(necesitaRevision).length,
  };
}

export async function verFaq({ repo }: Deps, email: string, id: string): Promise<Faq | null> {
  return repo.porId(email, id);
}

/** Crear una pregunta frecuente. */
export async function crearFaq(
  { repo }: Deps,
  datos: DatosFaq,
  creadaPor: string,
): Promise<Resultado<string>> {
  const errores = validarFaq(datos);
  if (Object.values(errores).some(Boolean)) {
    return { ok: false, error: "Revisa los campos marcados.", errores };
  }

  const id = await repo.crear(
    {
      ...datos,
      question: datos.question.trim(),
      answer: datos.answer.trim(),
      // Los pasos vacíos se descartan: quedan al editar cuando alguien borra el
      // texto de una línea pero no la línea.
      steps: (datos.steps ?? []).map((s) => s.trim()).filter(Boolean),
    },
    creadaPor,
  );

  return { ok: true, valor: id };
}

export async function editarFaq(
  { repo }: Deps,
  id: string,
  datos: Partial<DatosFaq>,
): Promise<Resultado> {
  if (datos.question !== undefined || datos.answer !== undefined || datos.category !== undefined) {
    /*
     * Para validar hace falta la versión guardada: se puede estar editando solo
     * la respuesta, y la pregunta y la categoría tienen que seguir siendo
     * válidas. Se usa `contenido`, que no depende de quién mira, en vez de
     * `porId` con un correo inventado.
     */
    const actual = await repo.contenido(id);
    if (!actual) return { ok: false, error: "La pregunta ya no existe." };

    const errores = validarFaq({
      question: datos.question ?? actual.question,
      answer: datos.answer ?? actual.answer,
      category: datos.category ?? actual.category,
    });
    if (Object.values(errores).some(Boolean)) {
      return { ok: false, error: "Revisa los campos marcados.", errores };
    }
  }

  await repo.editar(id, {
    ...datos,
    ...(datos.steps ? { steps: datos.steps.map((s) => s.trim()).filter(Boolean) } : {}),
  });
  return { ok: true };
}

export async function eliminarFaq({ repo }: Deps, id: string): Promise<Resultado> {
  await repo.eliminar(id);
  return { ok: true };
}

/** Marcar si una FAQ sirvió. */
export async function votarFaq(
  { repo }: Deps,
  id: string,
  email: string,
  util: boolean,
): Promise<Resultado<{ helpful: number; notHelpful: number }>> {
  const contadores = await repo.votar(id, email, util);
  return { ok: true, valor: contadores };
}
