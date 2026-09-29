// Módulo COMUNIDAD · INFRAESTRUCTURA · Las capturas de las preguntas.
//
// Una pregunta de soporte casi siempre tiene una pantalla detrás: el error que
// salió, el modelo que no cuadra, el diálogo que pide algo raro. Poder
// adjuntarla ahorra un ida y vuelta entero —«¿me mandas captura?»— que hoy pasa
// por Slack y se pierde.
//
// DÓNDE VIVEN. En una carpeta de Drive del Centro, igual que las capturas del
// FAQ y los videos de las capacitaciones. No en la base: una imagen en la base
// la hace pesada, lenta de respaldar, y nadie puede mirarla sin pasar por la
// aplicación.
//
// Se suben con la cuenta de QUIEN PREGUNTA, así que el archivo queda a su
// nombre y hereda los permisos de la carpeta —que está compartida con toda la
// empresa—. Por eso cualquiera puede ver las capturas sin que nadie comparta
// nada a mano.

import "server-only";

import type { drive_v3 } from "googleapis";
import { getDriveClient } from "@/lib/google/client";
import { gridDb } from "@/lib/grid/db";
import { carpeta } from "@/modules/faq/infrastructure/subir-captura";

/** «Comunidad», en el Drive de Sohersa. */
export const CARPETA_COMUNIDAD = "1TKfxmuJX9SpmAH6Dsmyfr0BW2aRZyARa";

/**
 * Lo que se acepta como captura.
 *
 * Solo imágenes, y por una razón práctica: la pregunta las pinta con `<img>`.
 * Un PDF o un `.rvt` ahí saldrían rotos, y admitirlos sin poder enseñarlos
 * sería peor que no admitirlos.
 */
const TIPOS = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

/**
 * El tope por imagen: 2 MB.
 *
 * No es una cifra suelta: `next.config` limita el cuerpo de una acción a 10 MB,
 * y aquí caben cuatro imágenes. Con un tope de 8 MB por imagen, cuatro capturas
 * grandes sumarían 32 MB y la subida moriría con el error crudo de Next, sin
 * que nadie entendiera por qué.
 *
 * 2 MB sobra para una captura de pantalla —rondan los 200 KB— y para una foto
 * del móvil ya comprimida. Quien traiga algo más grande recibe un mensaje que
 * lo dice, en vez de un fallo mudo.
 */
const TOPE_BYTES = 2 * 1024 * 1024;

/** Cuántas caben en una pregunta. Cuatro por 2 MB caben en el cuerpo de 10. */
export const TOPE_IMAGENES = 4;

export class ImagenError extends Error {}

/**
 * La carpeta del mes dentro de «Comunidad».
 *
 * Todo junto en una sola carpeta se vuelve inmanejable en unos meses: mil
 * archivos con nombres parecidos y sin forma de encontrar nada. Por mes queda
 * ordenado solo, sin que nadie tenga que decidir nada.
 */
async function carpetaDelMes(drive: drive_v3.Drive): Promise<string> {
  const ahora = new Date();
  const nombre = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  })
    .format(ahora)
    .replace("/", "-");

  return carpeta(drive, nombre, CARPETA_COMUNIDAD);
}

/** Lo que queda guardado de una imagen subida. */
export interface ImagenSubida {
  driveId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Sube una captura a la carpeta de Comunidad.
 *
 * El nombre lleva la fecha y el correo de quien pregunta: en Drive, una carpeta
 * de «Screenshot 2026-09-29 at 14.33.21.png» repetidos no dice de quién es
 * ninguno.
 */
export async function subirImagen(
  archivo: File,
  email: string,
  indice: number,
): Promise<ImagenSubida> {
  const tipo = (archivo.type || "").toLowerCase();

  if (!TIPOS.includes(tipo)) {
    throw new ImagenError(
      `«${archivo.name}» no es una imagen. Se aceptan PNG, JPG, GIF y WEBP.`,
    );
  }

  if (archivo.size > TOPE_BYTES) {
    const mb = (archivo.size / 1024 / 1024).toFixed(1);
    throw new ImagenError(
      `«${archivo.name}» pesa ${mb} MB y el tope son 2 MB. Recórtala o bájale la calidad.`,
    );
  }

  const drive = await getDriveClient();
  const destino = await carpetaDelMes(drive);

  const sello = new Date().toISOString().slice(0, 10);
  const usuario = email.split("@")[0];
  const ext = tipo.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const nombre = `${sello} ${usuario} ${indice + 1}.${ext}`;

  const { Readable } = await import("node:stream");
  const buffer = Buffer.from(await archivo.arrayBuffer());

  const creado = await drive.files.create({
    requestBody: { name: nombre, parents: [destino] },
    media: { mimeType: tipo, body: Readable.from(buffer) },
    fields: "id,name,size",
    supportsAllDrives: true,
  });

  const driveId = creado.data.id;
  if (!driveId) throw new ImagenError(`Drive no aceptó «${archivo.name}».`);

  return {
    driveId,
    fileName: creado.data.name ?? nombre,
    mimeType: tipo,
    sizeBytes: Number(creado.data.size ?? archivo.size),
  };
}

/**
 * Sube las capturas de una pregunta y las deja guardadas.
 *
 * Devuelve los avisos de lo que no se pudo subir SIN abortar: si de tres
 * capturas una es un PDF, valen más las dos buenas que perder la pregunta
 * entera. Quien pregunta ve qué pasó con la tercera y puede volver a
 * intentarlo.
 */
export async function guardarImagenes(
  questionId: string,
  archivos: File[],
  email: string,
  desde = 0,
): Promise<string[]> {
  const avisos: string[] = [];

  for (const [i, archivo] of archivos.entries()) {
    if (!archivo || archivo.size === 0) continue;

    try {
      const img = await subirImagen(archivo, email, desde + i);

      await gridDb().questionImage.create({
        data: {
          questionId,
          driveId: img.driveId,
          fileName: img.fileName,
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
          position: desde + i,
        },
      });
    } catch (e) {
      const motivo = e instanceof ImagenError ? e.message : `No se pudo subir «${archivo.name}».`;
      console.error(`[comunidad] imagen de ${questionId}: ${motivo}`);
      avisos.push(motivo);
    }
  }

  return avisos;
}

/**
 * Las imágenes que llegan en un formulario.
 *
 * Se filtran los huecos —un `<input type="file">` vacío llega igual— y se
 * recorta al tope: sin eso, alguien podría mandar cincuenta.
 */
export function imagenesDelFormulario(form: FormData, campo = "imagenes"): File[] {
  return form
    .getAll(campo)
    .filter((x): x is File => x instanceof File && x.size > 0)
    .slice(0, TOPE_IMAGENES);
}

/**
 * Retira una imagen de una pregunta.
 *
 * EL ARCHIVO DE DRIVE NO SE BORRA. Quitarlo de la pregunta es una decisión de
 * quien pregunta; borrarlo de Drive es irreversible y puede que alguien lo haya
 * enlazado en otro sitio. Queda en la carpeta del mes, sin que nadie lo
 * reclame, que es un precio barato frente a perderlo por un clic.
 */
export async function quitarImagen(imagenId: string, questionId: string): Promise<void> {
  await gridDb().questionImage.deleteMany({
    // El `questionId` va en el `where` para que nadie borre la imagen de otra
    // pregunta pasando un id suelto.
    where: { id: imagenId, questionId },
  });
}
