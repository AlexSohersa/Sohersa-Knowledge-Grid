"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/grid/session";
import {
  marcarLeidoWired,
  marcarLeidosWired,
} from "@/modules/notificaciones/infrastructure/wiring";

/**
 * Marcar avisos como leídos.
 *
 * El correo sale SIEMPRE de la sesión, nunca de lo que mande el navegador: es
 * lo que impide que alguien marque —o lea— los avisos de otra persona pasando
 * un id ajeno.
 */

export async function marcarLeidos(): Promise<void> {
  const yo = await exigirSesion();
  await marcarLeidosWired(yo.email);
  revalidatePath("/", "layout");
}

export async function marcarLeido(id: string): Promise<void> {
  const yo = await exigirSesion();
  await marcarLeidoWired(id, yo.email);
  revalidatePath("/", "layout");
}
