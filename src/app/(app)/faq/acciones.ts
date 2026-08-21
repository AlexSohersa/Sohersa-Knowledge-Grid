"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/grid/session";
import { votarFaqWired } from "@/modules/faq/infrastructure/wiring";

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
