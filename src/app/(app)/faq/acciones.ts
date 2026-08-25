"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/grid/session";
import {
  comentarWired,
  proponerFaqWired,
  votarFaqWired,
} from "@/modules/faq/infrastructure/wiring";
import { avisarAdminsWired } from "@/modules/notificaciones/infrastructure/wiring";
import { CapturaError, subirCaptura } from "@/modules/faq/infrastructure/subir-captura";

/**
 * Marcar si una pregunta frecuente sirvió.
 *
 * El correo sale de la sesión: sin eso, el contador se podría inflar enviando
 * correos inventados y dejaría de significar nada.
 */
export async function votarFaq(
  id: string,
  util: boolean,
): Promise<{ ok: boolean; helpful?: number; notHelpful?: number; error?: string }> {
  const yo = await exigirSesion();

  try {
    const res = await votarFaqWired(id, yo.email, util);
    if (!res.ok) return { ok: false, error: res.error };

    revalidatePath("/faq");
    return { ok: true, helpful: res.valor.helpful, notHelpful: res.valor.notHelpful };
  } catch {
    return { ok: false, error: "No se pudo registrar tu voto." };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PROPONER UNA FICHA
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Registra una propuesta y avisa a quien la tiene que revisar.
 *
 * No publica nada: la propuesta espera en la bandeja de Administración, tal
 * como dice el borrador —«la propuesta llega a Estandarización y Calidad, que
 * la revisa antes de publicarla en la base»—.
 */
export async function proponerFaq(
  form: FormData,
): Promise<{ ok: boolean; error?: string; errores?: Record<string, string> }> {
  const yo = await exigirSesion();

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const platform = String(form.get("platform") ?? "").trim() || null;
  const solution = String(form.get("solution") ?? "").trim() || null;
  const subcategoria = String(form.get("subcategoria") ?? "").trim() || null;

  /*
   * La validación vive aquí y no solo en el navegador: una acción de servidor
   * se puede invocar directamente, y un `required` en el HTML no protege nada.
   */
  const errores: Record<string, string> = {};
  if (title.length < 8) errores.title = "Describe el problema en una línea completa.";
  if (description.length < 20) errores.description = "Cuenta qué pasa con algo más de detalle.";
  if (Object.keys(errores).length > 0) return { ok: false, errores };

  /*
   * La captura, a Drive. Va ANTES de guardar la propuesta para que una imagen
   * que Drive rechaza no deje una propuesta a medias en la base.
   *
   * Se organiza sola por categoría y subcategoría, y se renombra: nadie tiene
   * que acordarse de cómo llamar al archivo ni dónde ponerlo.
   */
  let captura: { driveId: string; nombre: string } | null = null;
  const archivo = form.get("imagen");

  if (archivo instanceof File && archivo.size > 0) {
    try {
      captura = await subirCaptura(archivo, {
        categoria: platform,
        subcategoria: subcategoria,
        titulo: title,
      });
    } catch (e) {
      const motivo =
        e instanceof CapturaError
          ? e.message
          : "No se pudo guardar la captura en Drive. Prueba otra vez o envíala sin imagen.";
      return { ok: false, errores: { imagen: motivo } };
    }
  }

  const nombre = String(form.get("nombre") ?? "").trim() || yo.name;
  const area = String(form.get("area") ?? "").trim() || yo.area;

  try {
    const id = await proponerFaqWired(
      {
        title,
        description,
        platform,
        solution,
        imageDriveId: captura?.driveId ?? null,
        imageName: captura?.nombre ?? null,
      },
      { email: yo.email, nombre, area },
    );

    /*
     * Avisar es SECUNDARIO respecto a guardar: si el aviso fallara, la
     * propuesta ya está registrada y la bandeja la muestra igual. Por eso el
     * error se traga en vez de tumbar la operación.
     */
    await avisarAdminsWired({
      kind: "FAQ_PROPUESTA",
      title: "Nueva ficha propuesta",
      body: `${yo.name}: ${title}`,
      href: "/admin/faq",
      ref: id,
    }).catch(() => undefined);

    revalidatePath("/admin/faq");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar tu propuesta. Inténtalo otra vez." };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * COMENTAR AL ÁREA
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Manda un comentario a Estandarización y Calidad. */
export async function comentarFaq(
  form: FormData,
): Promise<{ ok: boolean; error?: string; errores?: Record<string, string> }> {
  const yo = await exigirSesion();

  const message = String(form.get("message") ?? "").trim();
  const faqId = String(form.get("faqId") ?? "").trim() || null;

  if (message.length < 10) {
    return { ok: false, errores: { message: "Escribe un poco más para que se entienda." } };
  }

  try {
    /*
     * El nombre y el área vienen del formulario, pero EL CORREO NO: ese sale
     * siempre de la sesión. Así alguien puede decir desde qué área escribe
     * —hay quien trabaja para dos— sin poder mandar un comentario a nombre de
     * otra persona.
     */
    const nombre = String(form.get("nombre") ?? "").trim() || yo.name;
    const area = String(form.get("area") ?? "").trim() || yo.area;

    const id = await comentarWired(
      { message, faqId },
      { email: yo.email, nombre, area },
    );

    await avisarAdminsWired({
      kind: "COMENTARIO_NUEVO",
      title: "Comentario nuevo",
      body: `${yo.name}: ${message.slice(0, 80)}${message.length > 80 ? "…" : ""}`,
      href: "/admin/faq",
      ref: id,
    }).catch(() => undefined);

    revalidatePath("/admin/faq");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar tu comentario. Inténtalo otra vez." };
  }
}
