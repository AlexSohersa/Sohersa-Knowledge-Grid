"use server";

import { revalidatePath } from "next/cache";
import {
  avisarAdminsWired,
  avisarWired,
} from "@/modules/notificaciones/infrastructure/wiring";
import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/grid/session";
import { gridDb } from "@/lib/grid/db";
import {
  guardarImagenes,
  imagenesDelFormulario,
  quitarImagen,
} from "@/modules/comunidad/infrastructure/imagenes-comunidad";
import {
  alternarVotoWired,
  comentarWired,
  eliminarPreguntaWired,
  eliminarRespuestaWired,
  preguntarWired,
  preguntaDeRespuestaWired,
  promoverAFaqWired,
  responderWired,
  validarComoSolucionWired,
  verPreguntaWired,
} from "@/modules/comunidad/infrastructure/wiring";

/**
 * Acciones de la comunidad.
 *
 * Todas resuelven la identidad en el SERVIDOR: quién eres sale de la sesión y
 * si administras sale de la base. Si el cliente pudiera enviar cualquiera de
 * las dos cosas, cualquiera podría validar respuestas —que es justo lo que da
 * autoridad a esta sección— o escribir a nombre de otro.
 */

export type EstadoFormulario = {
  ok: boolean;
  error?: string;
  errores?: Record<string, string | undefined>;
};

/** Publicar una pregunta. Al terminar, lleva a la pregunta recién creada. */
export async function preguntar(
  _previo: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const yo = await exigirSesion();

  const res = await preguntarWired(
    {
      title: String(form.get("title") ?? ""),
      body: String(form.get("body") ?? ""),
      category: String(form.get("category") ?? ""),
      software: String(form.get("software") ?? "") || null,
      tags: String(form.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    },
    { email: yo.email, name: yo.name, role: yo.role },
  );

  if (!res.ok) return { ok: false, error: res.error, errores: res.errores };

  /*
   * Las capturas, después de crear la pregunta.
   *
   * Necesitan su id para colgarse de ella, así que no pueden ir antes. Y si una
   * falla, la pregunta ya está guardada: vale más una pregunta sin captura que
   * perderla entera porque Drive tardó en responder.
   */
  const imagenes = imagenesDelFormulario(form);
  if (imagenes.length > 0) {
    /*
     * Un fallo aquí queda en el registro, no en pantalla: esta acción redirige
     * a la pregunta recién creada, así que no hay dónde enseñar el aviso. Lo
     * que importa —la pregunta— ya está guardado, y las capturas se pueden
     * añadir editándola.
     */
    const avisos = await guardarImagenes(String(res.valor), imagenes, yo.email).catch((e) => [
      e instanceof Error ? e.message : "error de Drive",
    ]);

    if (avisos.length > 0) {
      console.error(`[comunidad] capturas de ${res.valor}: ${avisos.join(" · ")}`);
    }
  }

  /*
   * Aviso a quien administra. Va antes del `redirect` porque ese lanza una
   * excepción de control de flujo y nada de lo que quede después se ejecuta.
   */
  await avisarAdminsWired({
    kind: "PREGUNTA_NUEVA",
    title: "Pregunta nueva en la comunidad",
    body: `${yo.name}: ${String(form.get("title") ?? "").slice(0, 80)}`,
    href: `/comunidad/${res.valor}`,
    ref: String(res.valor),
  }).catch(() => undefined);

  revalidatePath("/comunidad");
  // `redirect` lanza una excepción de control de flujo: tiene que ir FUERA de
  // cualquier try/catch, o se capturaría como si fuera un error.
  redirect(`/comunidad/${res.valor}`);
}

/** Responder a una pregunta. */
export async function responder(
  preguntaId: string,
  _previo: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const yo = await exigirSesion();

  const res = await responderWired(preguntaId, String(form.get("body") ?? ""), {
    email: yo.email,
    name: yo.name,
    role: yo.role,
  });

  if (!res.ok) return { ok: false, error: res.error };

  /*
   * Avisar a quien preguntó: es el aviso que de verdad se espera.
   *
   * No se avisa a quien se responde a sí mismo —sabe perfectamente que acaba
   * de escribir—. El `ref` lleva el id de la RESPUESTA, no el de la pregunta,
   * para que dos respuestas distintas produzcan dos avisos y no se descarte la
   * segunda como repetida.
   */
  const pregunta = await verPreguntaWired(yo.email, preguntaId).catch(() => null);
  const autor = pregunta?.email ?? null;

  if (autor && autor.toLowerCase() !== yo.email.toLowerCase()) {
    await avisarWired({
      email: autor,
      kind: "RESPUESTA_A_TU_PREGUNTA",
      title: "Respondieron tu pregunta",
      body: `${yo.name} respondió: ${pregunta?.title.slice(0, 70) ?? ""}`,
      href: `/comunidad/${preguntaId}`,
      ref: String(res.valor ?? preguntaId),
    }).catch(() => undefined);
  }

  revalidatePath(`/comunidad/${preguntaId}`);
  revalidatePath("/comunidad");
  return { ok: true };
}

/** Validar (o quitar la validación de) una respuesta como solución. */
export async function validarSolucion(
  respuestaId: string,
  validar: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await exigirSesion();

  const res = await validarComoSolucionWired(respuestaId, yo.email, yo.isAdmin, validar);
  if (!res.ok) return { ok: false, error: res.error };

  const preguntaId = await preguntaDeRespuestaWired(respuestaId);
  if (preguntaId) revalidatePath(`/comunidad/${preguntaId}`);
  revalidatePath("/comunidad");
  return { ok: true };
}

/** Votar o quitar el voto a una respuesta. */
export async function votarRespuesta(
  respuestaId: string,
): Promise<{ ok: boolean; votos?: number; error?: string }> {
  const yo = await exigirSesion();

  const res = await alternarVotoWired(respuestaId, yo.email);
  if (!res.ok) return { ok: false, error: res.error };

  const preguntaId = await preguntaDeRespuestaWired(respuestaId);
  if (preguntaId) revalidatePath(`/comunidad/${preguntaId}`);
  return { ok: true, votos: res.valor };
}

/** Comentar una respuesta. */
export async function comentar(
  respuestaId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await exigirSesion();

  const res = await comentarWired(respuestaId, body, {
    email: yo.email,
    name: yo.name,
    role: yo.role,
  });
  if (!res.ok) return { ok: false, error: res.error };

  const preguntaId = await preguntaDeRespuestaWired(respuestaId);
  if (preguntaId) revalidatePath(`/comunidad/${preguntaId}`);
  return { ok: true };
}

/** Borrar una respuesta: su autor o administración. */
export async function borrarRespuesta(
  respuestaId: string,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await exigirSesion();

  // La pregunta se busca ANTES de borrar: después, la respuesta ya no existe y
  // no habría forma de saber qué ruta revalidar.
  const preguntaId = await preguntaDeRespuestaWired(respuestaId);

  const res = await eliminarRespuestaWired(respuestaId, yo.email, yo.isAdmin);
  if (!res.ok) return { ok: false, error: res.error };

  if (preguntaId) revalidatePath(`/comunidad/${preguntaId}`);
  revalidatePath("/comunidad");
  return { ok: true };
}

/** Borrar una pregunta: su autor o administración. */
export async function borrarPregunta(id: string): Promise<{ ok: boolean; error?: string }> {
  const yo = await exigirSesion();

  const res = await eliminarPreguntaWired(yo.email, id, yo.isAdmin);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/comunidad");
  redirect("/comunidad");
}

/**
 * Corrige una pregunta propia.
 *
 * Faltaba, y se notaba: una pregunta con una errata, o a la que se le olvidó la
 * captura, no tenía arreglo. La única salida era borrarla y escribirla otra
 * vez, perdiendo las respuestas que ya tuviera.
 *
 * SOLO LA PROPIA, o cualquiera si se administra. La comprobación va en el
 * servidor y no en si se pinta el botón: esconderlo no impide llamar a la
 * acción a mano.
 */
export async function editarPregunta(
  id: string,
  form: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await exigirSesion();

  const pregunta = await verPreguntaWired(yo.email, id);
  if (!pregunta) return { ok: false, error: "Esa pregunta ya no existe." };

  const esSuya = pregunta.email.toLowerCase() === yo.email.toLowerCase();
  if (!esSuya && !yo.isAdmin) {
    return { ok: false, error: "Solo quien la escribió puede editarla." };
  }

  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();

  if (!title) return { ok: false, error: "La pregunta necesita un título." };
  if (!body) return { ok: false, error: "Escribe en qué consiste el problema." };

  try {
    await gridDb().question.update({
      where: { id },
      data: {
        title,
        body,
        // `editedAt` marca las ediciones de VERDAD. `updatedAt` se mueve con
        // cualquier cosa —una respuesta, una vista—, así que usarlo haría
        // aparecer «editada» en preguntas que nadie tocó.
        editedAt: new Date(),
      },
    });

    /*
     * Las capturas nuevas, numeradas a partir de las que ya tenía.
     *
     * LOS AVISOS SE DEVUELVEN. Antes esto llevaba un `.catch(() => [])` que se
     * tragaba los fallos: si Drive rechazaba una imagen, el cambio se guardaba,
     * parecía que todo había ido bien, y la captura simplemente no estaba. Un
     * fallo mudo es peor que uno ruidoso.
     */
    let avisos: string[] = [];
    const nuevas = imagenesDelFormulario(form);

    if (nuevas.length > 0) {
      const cuantas = await gridDb()
        .questionImage.count({ where: { questionId: id } })
        .catch(() => 0);

      avisos = await guardarImagenes(id, nuevas, yo.email, cuantas).catch((e) => [
        `No se pudieron subir las capturas: ${e instanceof Error ? e.message : "error de Drive"}`,
      ]);
    }

    revalidatePath(`/comunidad/${id}`);
    revalidatePath("/comunidad");

    // El texto se guardó; lo de las capturas es un aviso, no un fallo.
    return avisos.length > 0 ? { ok: true, error: avisos.join(" ") } : { ok: true };
  } catch (e) {
    console.error(`[comunidad] no se pudo editar ${id}: ${e instanceof Error ? e.message : e}`);
    return { ok: false, error: "No se pudo guardar el cambio." };
  }
}

/** Quita una captura de una pregunta propia. */
export async function quitarImagenPregunta(
  imagenId: string,
  preguntaId: string,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await exigirSesion();

  const pregunta = await verPreguntaWired(yo.email, preguntaId);
  if (!pregunta) return { ok: false, error: "Esa pregunta ya no existe." };

  const esSuya = pregunta.email.toLowerCase() === yo.email.toLowerCase();
  if (!esSuya && !yo.isAdmin) {
    return { ok: false, error: "Solo quien la escribió puede quitar sus capturas." };
  }

  await quitarImagen(imagenId, preguntaId);

  revalidatePath(`/comunidad/${preguntaId}`);
  return { ok: true };
}

/** Promover una pregunta resuelta a pregunta frecuente. */
export async function promoverAFaq(
  preguntaId: string,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await exigirSesion();

  const res = await promoverAFaqWired(yo.email, preguntaId, yo.isAdmin);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/faq");
  revalidatePath(`/comunidad/${preguntaId}`);
  return { ok: true };
}
