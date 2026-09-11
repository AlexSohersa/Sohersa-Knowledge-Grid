// Módulo CAPACITACIONES · INFRAESTRUCTURA · La carpeta de Drive de cada una.
//
// Antes, cada capacitación vivía donde la dejó quien la grabó: en el Drive de
// esa persona, compartida con el resto. Funciona hasta el día en que esa
// persona reorganiza sus carpetas o deja la empresa, y entonces se cae un
// material que ya nadie sabe dónde estaba.
//
// Todo lo del Centro se junta ahora bajo una sola carpeta, con la misma
// estructura para todas:
//
//   Capacitaciones Centro de Conocimiento/
//   └── CAP-003 Design Thinking/
//       ├── 01 Video/
//       ├── 02 Materiales/
//       └── 03 Notas/
//
// POR QUÉ EL CÓDIGO VA EN EL NOMBRE DE LA CARPETA. El título se corrige, se
// acorta, se traduce; el código no cambia nunca. Con él delante, la carpeta
// sigue siendo reconocible aunque la ficha se renombre, y el orden alfabético
// de Drive coincide con el orden real de las capacitaciones. Es lo mismo que
// ya se hace con las fichas del FAQ.

import "server-only";

import type { drive_v3 } from "googleapis";
import { getDriveClient } from "@/lib/google/client";
import { carpeta } from "@/modules/faq/infrastructure/subir-captura";

type Drive = drive_v3.Drive;

/**
 * «Capacitaciones Centro de Conocimiento», en el Drive de Sohersa.
 *
 * Fija en el código y no en una variable de entorno, por lo mismo que la del
 * FAQ: si el día de mañana apunta a otro sitio, es un cambio que merece quedar
 * registrado en el historial, no un valor que alguien cambia en un panel sin
 * dejar rastro de por qué.
 */
export const CARPETA_CAPACITACIONES = "1e06I76WHvd116I1Ir4htkuSy7XakTmZF";

/**
 * Las tres subcarpetas, siempre las mismas y siempre en este orden.
 *
 * Van numeradas para que Drive las muestre en el orden en que se usan —el
 * video primero, las notas al final— en vez de alfabético, que las dejaría
 * como Materiales · Notas · Video.
 */
export const SUBCARPETAS = {
  video: "01 Video",
  materiales: "02 Materiales",
  notas: "03 Notas",
} as const;

export type Subcarpeta = keyof typeof SUBCARPETAS;

/** Lo que Drive admite como nombre sin volverse confuso. */
function limpiar(s: string): string {
  return s.replace(/[\\/]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * El nombre de la carpeta de una capacitación: «CAP-003 Design Thinking».
 *
 * Sin código —una capacitación recién creada que aún no lo tiene— se queda
 * solo con el título, y al asignarle código se renombra.
 */
export function nombreCarpeta(codigo: string | null, titulo: string): string {
  const t = limpiar(titulo) || "Sin título";
  return codigo ? `${codigo} ${t}` : t;
}

/**
 * La subcarpeta que toca, creando lo que falte por el camino.
 *
 * Devuelve el id de `01 Video`, `02 Materiales` o `03 Notas` dentro de la
 * carpeta de esa capacitación, que a su vez se crea si no existía.
 *
 * Se apoya en `carpeta()` del FAQ, que busca antes de crear: sin esa búsqueda
 * cada subida crearía una carpeta nueva junto a la anterior, porque Drive
 * permite nombres repetidos.
 */
export async function subcarpetaDe(
  drive: Drive,
  codigo: string | null,
  titulo: string,
  cual: Subcarpeta,
): Promise<string> {
  const madre = await carpeta(drive, nombreCarpeta(codigo, titulo), CARPETA_CAPACITACIONES);
  return carpeta(drive, SUBCARPETAS[cual], madre);
}

/** La carpeta de la capacitación, sin bajar a las subcarpetas. */
export async function carpetaDeCapacitacion(
  drive: Drive,
  codigo: string | null,
  titulo: string,
): Promise<string> {
  return carpeta(drive, nombreCarpeta(codigo, titulo), CARPETA_CAPACITACIONES);
}

/**
 * Deja la carpeta con sus tres subcarpetas, aunque estén vacías.
 *
 * Se llama al crear una capacitación para que quien vaya a Drive encuentre el
 * sitio ya preparado en vez de una carpeta vacía donde no se sabe qué va
 * dónde. Devuelve el id de la carpeta madre.
 */
export async function prepararCarpeta(
  codigo: string | null,
  titulo: string,
): Promise<string> {
  const drive = await getDriveClient();
  const madre = await carpeta(drive, nombreCarpeta(codigo, titulo), CARPETA_CAPACITACIONES);

  for (const nombre of Object.values(SUBCARPETAS)) {
    await carpeta(drive, nombre, madre);
  }

  return madre;
}

export interface ArchivoCopiado {
  driveId: string;
  nombre: string;
  /** `true` si ya estaba ahí de antes y no se volvió a copiar. */
  yaEstaba: boolean;
}

/**
 * Trae un archivo de Drive a la carpeta de la capacitación.
 *
 * COPIA, NO MUEVE, y esto es lo que hace que todo el plan funcione sin tocar
 * los permisos de nadie:
 *
 *   · Copiar solo exige poder VER el original. El archivo nuevo es de quien
 *     copia, así que el Centro acaba siendo dueño de su propio material sin
 *     pedirle nada al que grabó.
 *   · Mover, en cambio, sacaría el archivo del Drive de esa persona sin
 *     avisarle, y ese material es suyo.
 *
 * Se usa la cuenta de QUIEN LO LANZA desde Administración, así que solo se
 * copia lo que esa persona ya podía ver. Es el mismo principio del resto de la
 * aplicación: no amplía el acceso de nadie.
 */
export async function copiarArchivo(
  origenId: string,
  codigo: string | null,
  titulo: string,
  cual: Subcarpeta,
  nombreDestino?: string,
): Promise<ArchivoCopiado> {
  const drive = await getDriveClient();
  const destino = await subcarpetaDe(drive, codigo, titulo, cual);

  const original = await drive.files.get({
    fileId: origenId,
    fields: "name,parents,mimeType",
    supportsAllDrives: true,
  });

  const nombre = nombreDestino ?? original.data.name ?? "archivo";

  /*
   * ¿Ya está ahí? Se mira por NOMBRE dentro de la carpeta destino.
   *
   * Sin esto, relanzar una importación —algo que pasa: se corrige un dato y se
   * vuelve a correr— dejaría una segunda copia del mismo video de 40 MB junto
   * a la primera, y en tres intentos habría tres.
   */
  const escapado = nombre.replace(/'/g, "\\'");
  const existente = await drive.files.list({
    q: `name = '${escapado}' and '${destino}' in parents and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const ya = existente.data.files?.[0]?.id;
  if (ya) return { driveId: ya, nombre, yaEstaba: true };

  const copia = await drive.files.copy({
    fileId: origenId,
    requestBody: { name: nombre, parents: [destino] },
    fields: "id",
    supportsAllDrives: true,
  });

  const id = copia.data.id;
  if (!id) throw new Error(`Drive no devolvió la copia de «${nombre}».`);

  return { driveId: id, nombre, yaEstaba: false };
}

/**
 * Sube un archivo desde la computadora a la carpeta que le toca.
 *
 * La otra mitad de lo mismo: lo que ya vive en Drive se copia, lo que viene
 * del disco duro se sube. Ambos acaban en el mismo sitio y con el mismo
 * criterio de nombres.
 */
export async function subirArchivo(
  archivo: File,
  codigo: string | null,
  titulo: string,
  cual: Subcarpeta,
  nombreDestino?: string,
): Promise<ArchivoCopiado> {
  const drive = await getDriveClient();
  const destino = await subcarpetaDe(drive, codigo, titulo, cual);

  const nombre = nombreDestino ?? archivo.name;
  const { Readable } = await import("node:stream");
  const buffer = Buffer.from(await archivo.arrayBuffer());

  const creado = await drive.files.create({
    requestBody: { name: nombre, parents: [destino] },
    media: {
      mimeType: archivo.type || "application/octet-stream",
      body: Readable.from(buffer),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const id = creado.data.id;
  if (!id) throw new Error(`Drive no aceptó «${nombre}».`);

  return { driveId: id, nombre, yaEstaba: false };
}

/**
 * El id de Drive que hay dentro de un enlace, sea de la forma que sea.
 *
 * Los enlaces llegan copiados del navegador y no hay una sola forma:
 *
 *   /file/d/<id>/view          · un archivo suelto
 *   /document/d/<id>/edit      · un documento
 *   /drive/folders/<id>        · una carpeta
 *   ?id=<id>                   · los enlaces viejos de descarga
 *
 * Devuelve `null` si no reconoce ninguna: así quien pega algo que no es de
 * Drive recibe un aviso claro en vez de un fallo más adelante.
 */
export function idDesdeEnlace(enlace: string): string | null {
  const s = enlace.trim();
  if (!s) return null;

  // Un id pegado a secas, sin enlace alrededor.
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;

  const patrones = [
    /\/file\/d\/([A-Za-z0-9_-]+)/,
    /\/document\/d\/([A-Za-z0-9_-]+)/,
    /\/presentation\/d\/([A-Za-z0-9_-]+)/,
    /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/,
    /\/drive\/folders\/([A-Za-z0-9_-]+)/,
    /[?&]id=([A-Za-z0-9_-]+)/,
  ];

  for (const p of patrones) {
    const m = s.match(p);
    if (m?.[1]) return m[1];
  }

  return null;
}
