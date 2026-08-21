"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/grid/session";
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
