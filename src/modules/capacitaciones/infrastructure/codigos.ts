// Módulo CAPACITACIONES · INFRAESTRUCTURA · Los códigos y los enlaces.
//
// Lo que queda de lo que fue el importador de notas de Gemini.
//
// Aquel importador leía el documento de notas de una sesión y sacaba de ahí la
// ficha entera: título, resumen, objetivos, un tema por cada punto del
// desglose. Se retiró porque ese contenido lo redactaba un modelo escuchando la
// reunión, y en la ficha se leía como si lo hubiera escrito alguien del área.
//
// De aquel trabajo sobrevive lo que no dependía de las notas: llevar la serie
// de códigos y construir los enlaces a Drive.

import "server-only";

import { gridDb } from "@/lib/grid/db";
import { CARPETA_CAPACITACIONES } from "./carpeta-drive";

/**
 * El siguiente código libre de la serie: CAP-001, CAP-002…
 *
 * Se mira el MAYOR que haya, no cuántas hay: si alguna se borró, contar daría
 * un código ya usado y el índice único lo rechazaría. Mismo criterio que las
 * fichas del FAQ.
 */
export async function siguienteCodigo(): Promise<string> {
  const filas = await gridDb()
    .training.findMany({
      where: { code: { startsWith: "CAP-" } },
      select: { code: true },
    })
    .catch(() => [] as { code: string | null }[]);

  let mayor = 0;
  for (const f of filas) {
    const n = Number(f.code?.slice(4));
    if (Number.isFinite(n) && n > mayor) mayor = n;
  }

  return `CAP-${String(mayor + 1).padStart(3, "0")}`;
}

/** El enlace a una carpeta de Drive, para enseñarlo o abrirlo. */
export function enlaceCarpeta(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

/** La carpeta madre: «Capacitaciones Centro de Conocimiento». */
export const ENLACE_CARPETA_MADRE = enlaceCarpeta(CARPETA_CAPACITACIONES);
