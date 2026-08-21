// Módulo Biblioteca · INFRAESTRUCTURA · Sincronización del cronograma.
//
// Trae el "Cronograma de Estandarización" desde Google Sheets a la tabla
// `Resource`, que ahora es DE ESTA HERRAMIENTA: el módulo de Recursos se retira
// de Digital Core y la biblioteca vive aquí, que es su lugar natural.
//
// El procedimiento es el mismo que usaba Digital Core —misma hoja, mismas
// columnas, mismo cruce por número de documento—, así que la sincronización da
// idénticos resultados y la transición es transparente para el equipo.
//
// Se lee y se escribe con la cuenta de QUIEN sincroniza, no con una cuenta de
// servicio: así cada quien ve los archivos a los que ya tiene acceso en Drive.
// El Centro hereda permisos, no los amplía.

import "server-only";

import { getSheetsClient, GoogleAuthError } from "@/lib/google/client";
import { db as sohersaDb, dbConfigured } from "@/lib/grid/db";

/**
 * La hoja del cronograma.
 *
 * Se deja configurable por entorno para poder apuntar a una copia de pruebas
 * sin tocar el código; por omisión, la misma que usa Digital Core.
 */
const SHEET_ID =
  process.env.CRONOGRAMA_SHEET_ID ?? "17FurtgUHN5pRqGzsvG37VZ0suO6Afuo7nR2bNAPB7XA";

const TAB_CRONOGRAMA = "CRONOGRAMA DE ESTANDARIZACIÓN";
const TAB_LINKS = "_REGISTRO_LINKS_";

/**
 * La etiqueta de nuestras filas en la bitácora.
 *
 * `SyncLog` es COMPARTIDA con el portal, que registra ahí sus propias
 * sincronizaciones con `target = "sheets"`. Filtrar siempre por esta constante
 * evita contar las suyas como nuestras —y que una constante lo vigile evita
 * depender de que cada quien recuerde escribirlo.
 */
export const SYNC_TARGET = "recursos";

/* Columnas del cronograma, tal como están en la hoja (índice base 0):
   B número · C capacitación · D título · E archivo · F autor
   G prioridad · H necesario · I comentarios · J avance            */
const COL = {
  numero: 1,
  capacitacion: 2,
  titulo: 3,
  archivo: 4,
  autor: 5,
  prioridad: 6,
  necesario: 7,
  comentarios: 8,
  avance: 9,
} as const;

export type ResultadoSync = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  error?: string;
};

/** Texto limpio de una celda, o `null` si viene vacía. */
function txt(v: unknown): string | null {
  const s = String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s === "" ? null : s;
}

/**
 * El orden de un código dentro de su sección.
 *
 * "2.10" tiene que ir después de "2.9", y comparar como texto los ordenaría al
 * revés. Se convierte a un entero: sección × 1000 + posición.
 */
function ordenDe(code: string): number {
  const [sec, pos] = code.split(".");
  return Number(sec ?? 0) * 1000 + Number(pos ?? 0);
}

/**
 * Trae el cronograma al día.
 *
 * Se leen DOS pestañas y se cruzan por el número de documento:
 *   · "CRONOGRAMA DE ESTANDARIZACIÓN" — qué es cada documento y su estado.
 *   · "_REGISTRO_LINKS_"              — dónde vive el archivo en Drive.
 *
 * Los recursos dados de alta a mano (`origin = "manual"`) no se tocan nunca:
 * no vienen del cronograma y sobrescribirlos borraría trabajo de alguien.
 */
export async function sincronizarCronograma(runBy?: string | null): Promise<ResultadoSync> {
  if (!dbConfigured) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      error: "La base de datos no está configurada (DATABASE_URL).",
    };
  }

  const db = sohersaDb();

  try {
    const sheets = await getSheetsClient();

    const [cronograma, links] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB_CRONOGRAMA}!A1:L200`,
        valueRenderOption: "UNFORMATTED_VALUE",
      }),
      sheets.spreadsheets.values
        .get({ spreadsheetId: SHEET_ID, range: `${TAB_LINKS}!A1:H300` })
        // Si esa pestaña no existe, se sigue sin enlaces en vez de fallar: el
        // cronograma sin archivos sigue siendo información útil.
        .catch(() => ({ data: { values: [] as string[][] } })),
    ]);

    // Mapa número → archivo en Drive.
    const porNumero = new Map<
      string,
      { driveId?: string; url?: string; name?: string; mime?: string; size?: number }
    >();

    for (const fila of links.data.values ?? []) {
      const num = txt(fila[0]);
      if (!num || num === "NUM") continue;
      const nombre = txt(fila[3]);
      porNumero.set(num, {
        driveId: txt(fila[1]) ?? undefined,
        url: txt(fila[2]) ?? undefined,
        // "(sin acceso)" es lo que escribe la macro cuando no puede leerlo.
        name: nombre === "(sin acceso)" ? undefined : (nombre ?? undefined),
        mime: txt(fila[4]) ?? undefined,
        size: Number(fila[5]) || undefined,
      });
    }

    const filas = cronograma.data.values ?? [];

    let seccionActual = "General";
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const fila of filas) {
      const numero = txt(fila[COL.numero]);
      const titulo = txt(fila[COL.titulo]);
      if (!numero) continue;

      // Una fila sin punto ("1", "2") es el encabezado de una sección: no es un
      // documento, define a qué sección pertenecen las que vienen debajo.
      if (/^\d+$/.test(numero)) {
        if (titulo) seccionActual = titulo;
        continue;
      }

      if (!/^\d+\.\d+$/.test(numero) || !titulo) {
        skipped++;
        continue;
      }

      const link = porNumero.get(numero);
      const avance = Number(fila[COL.avance]);

      const datos = {
        title: titulo,
        section: seccionActual,
        position: ordenDe(numero),
        fileName: link?.name ?? txt(fila[COL.archivo]),
        driveId: link?.driveId ?? null,
        url: link?.url ?? null,
        mimeType: link?.mime ?? null,
        sizeBytes: link?.size ?? null,
        author: txt(fila[COL.autor]),
        training: txt(fila[COL.capacitacion]),
        priority: txt(fila[COL.prioridad]),
        required: fila[COL.necesario] === true || fila[COL.necesario] === "TRUE",
        notes: txt(fila[COL.comentarios]),
        progress: Number.isFinite(avance) ? avance : null,
      };

      const existente = await db.resource.findUnique({
        where: { code_origin: { code: numero, origin: "sheet" } },
      });

      if (existente) {
        await db.resource.update({ where: { id: existente.id }, data: datos });
        updated++;
      } else {
        await db.resource.create({
          data: { ...datos, code: numero, origin: "sheet" },
        });
        created++;
      }
    }

    await db.syncLog.create({
      data: { target: SYNC_TARGET, ok: true, created, updated, skipped, runBy: runBy ?? null },
    });

    return { ok: true, created, updated, skipped };
  } catch (e) {
    const error =
      e instanceof GoogleAuthError
        ? e.message
        : `No se pudo leer el cronograma: ${String((e as Error).message).slice(0, 160)}`;

    // El registro del fallo se intenta, pero si también falla no se enmascara
    // el error original, que es el que explica qué pasó.
    await db.syncLog
      .create({
        data: { target: SYNC_TARGET, ok: false, error, runBy: runBy ?? null },
      })
      .catch(() => {});

    return { ok: false, created: 0, updated: 0, skipped: 0, error };
  }
}
