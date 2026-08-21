"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "@/lib/grid/session";
import {
  sincronizarCronograma,
  type ResultadoSync,
} from "@/modules/biblioteca/infrastructure/sync-cronograma";

/**
 * Trae el Cronograma de Estandarización al día.
 *
 * Se sincroniza CON LA CUENTA de quien pulsa el botón: Google entrega solo los
 * archivos a los que esa persona ya tiene acceso, así que el Centro hereda los
 * permisos de Drive en vez de ampliarlos.
 *
 * Es la misma hoja y el mismo procedimiento que usa Digital Core. Ejecutarlo
 * desde aquí o desde allá da exactamente el mismo resultado.
 */
export async function sincronizarBiblioteca(): Promise<ResultadoSync> {
  const yo = await exigirSesion();

  const res = await sincronizarCronograma(yo.email);

  if (res.ok) {
    revalidatePath("/biblioteca");
    // El contador de documentos vive en el riel, que está en el layout.
    revalidatePath("/", "layout");
  }

  return res;
}
