"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/grid/session";
import {
  guardarPosicionWired,
  marcarAvanceWired,
  registrarDescargaWired,
} from "@/modules/rutas/infrastructure/wiring";

/**
 * Acciones de avance de una ruta.
 *
 * El correo sale de la SESIÓN y la asignación se comprueba en el caso de uso:
 * sin eso, cualquiera podría completar la ruta de otra persona enviando ids.
 */

export type Resultado = { ok: boolean; error?: string };

/** Marca (o desmarca) un elemento —o un tema suyo— como hecho. */
export async function marcarAvance(
  pathId: string,
  itemId: string,
  topicId: string | null,
  completado: boolean,
): Promise<Resultado> {
  const yo = await exigirSesion();

  try {
    const res = await marcarAvanceWired(yo.email, pathId, itemId, topicId, completado);
    if (!res.ok) return res;
  } catch {
    return { ok: false, error: "No se pudo guardar tu avance. Vuelve a intentarlo." };
  }

  /*
   * Se revalidan cuatro sitios porque el avance de la ruta se muestra en
   * cuatro: la propia ruta, el inicio, el expediente y el riel, que lleva el
   * porcentaje. Olvidar uno haría que el número no cuadrara entre pantallas.
   */
  revalidatePath("/ruta");
  revalidatePath("/aprendizaje");
  revalidatePath("/");
  revalidatePath("/", "layout");

  return { ok: true };
}

/** Registra que se descargó el material de un elemento. */
export async function registrarDescarga(
  pathId: string,
  itemId: string,
  topicId: string | null,
): Promise<Resultado> {
  const yo = await exigirSesion();
  try {
    await registrarDescargaWired(yo.email, pathId, itemId, topicId);
  } catch {
    // Perder el registro de una descarga no merece un error visible: el
    // archivo se descargó igual, que es lo que la persona quería.
    return { ok: false };
  }
  revalidatePath("/ruta");
  return { ok: true };
}

/** Guarda el segundo del video donde se quedó, para reanudar. */
export async function guardarPosicion(
  pathId: string,
  itemId: string,
  topicId: string | null,
  segundos: number,
): Promise<Resultado> {
  const yo = await exigirSesion();
  try {
    await guardarPosicionWired(yo.email, pathId, itemId, topicId, segundos);
  } catch {
    return { ok: false };
  }
  // No se revalida: la posición no se muestra, solo se usa al reanudar.
  return { ok: true };
}
