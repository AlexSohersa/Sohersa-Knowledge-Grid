"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/grid/session";
import type { KindId } from "@/modules/shared/domain/conocimiento";
import { alternarGuardadoWired } from "@/modules/personal/infrastructure/wiring";

/**
 * Acciones de lo personal: los guardados.
 *
 * Toman el correo de la SESIÓN en el servidor, nunca de un parámetro. Si el
 * cliente pudiera enviarlo, cualquiera guardaría cosas a nombre de otra
 * persona.
 */

/** Guarda o quita algo de la lista de guardados. Devuelve el estado nuevo. */
export async function alternarGuardado(
  kind: KindId,
  targetId: string,
  title: string,
): Promise<{ ok: boolean; guardado: boolean }> {
  const yo = await exigirSesion();
  const guardado = await alternarGuardadoWired(yo.email, kind, targetId, title);

  // La insignia de la barra superior vive en el layout, así que hay que
  // revalidar la raíz para que el número cambie sin recargar.
  revalidatePath("/", "layout");

  return { ok: true, guardado };
}
