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

import { Readable } from "node:stream";
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
 * El tope por imagen, en el servidor.
 *
 * Es una RED DE SEGURIDAD, no el límite que se ve: el navegador encoge las
 * imágenes grandes antes de mandarlas, así que a este punto llegan ya
 * ajustadas. Esto solo ataja lo que se salte ese paso —un navegador que no
 * pudo procesar el archivo, alguien llamando a la acción por su cuenta—.
 *
 * `next.config` limita el cuerpo de una acción a 10 MB y aquí caben cuatro
 * imágenes, así que 2.5 MB por imagen deja margen sin acercarse al borde.
 */
const TOPE_BYTES = 2.5 * 1024 * 1024;

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
      `«${archivo.name}» pesa ${mb} MB y no se pudo ajustar en tu navegador. ` +
        `Recórtala o guárdala con menos calidad antes de subirla.`,
    );
  }

  const drive = await getDriveClient();
  const destino = await carpetaDelMes(drive);

  const sello = new Date().toISOString().slice(0, 10);
  const usuario = email.split("@")[0];
  const ext = tipo.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const nombre = `${sello} ${usuario} ${indice + 1}.${ext}`;

  /*
   * `Readable` se importa ARRIBA, no aquí dentro.
   *
   * Estaba con `await import("node:stream")` y fallaba con «Cannot read
   * properties of undefined (reading 'from')»: en el empaquetado de
   * producción ese import dinámico no entrega el módulo con `Readable`
   * directo, así que `Readable.from` se llamaba sobre `undefined`.
   *
   * El FAQ lleva el import estático desde el principio y sube sin problemas;
   * esto hace lo mismo.
   */
  const cuerpo = Readable.from(Buffer.from(await archivo.arrayBuffer()));

  const creado = await drive.files.create({
    requestBody: { name: nombre, parents: [destino] },
    media: { mimeType: tipo, body: cuerpo },
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
      /*
       * EL MOTIVO DE GOOGLE LLEGA HASTA QUIEN SUBE.
       *
       * Antes se decía «No se pudo subir» y nada más, y con eso no hay forma de
       * saber si falta permiso en la carpeta, si el archivo es de un tipo
       * rechazado o si Drive está caído. Cada uno se arregla distinto, así que
       * esconder cuál es solo obliga a adivinar.
       */
      const crudo = e instanceof Error ? e.message : String(e);
      const motivo =
        e instanceof ImagenError
          ? e.message
          : `No se pudo subir «${archivo.name}»: ${explicar(crudo)}`;

      console.error(`[comunidad] imagen de ${questionId}: ${crudo}`);
      avisos.push(motivo);
    }
  }

  return avisos;
}

/**
 * El fallo de Google, dicho en algo que se pueda accionar.
 *
 * Los errores de la API llegan en inglés y con jerga —«File not found»,
 * «Insufficient permissions»— y quien sube una captura no tiene por qué
 * interpretarlos. Lo que importa es qué hacer a continuación.
 */
function explicar(crudo: string): string {
  if (/insufficient|permission|forbidden|403/i.test(crudo)) {
    return "tu cuenta no puede escribir en la carpeta «Comunidad» de Drive. Pide que te den permiso de editor.";
  }
  if (/not found|404/i.test(crudo)) {
    return "no se encontró la carpeta «Comunidad» en Drive. Avisa a quien administra.";
  }
  if (/quota|storage/i.test(crudo)) {
    return "el Drive de la empresa no tiene espacio libre.";
  }
  if (/invalid_grant|unauthorized|401|token/i.test(crudo)) {
    return "tu sesión de Google caducó. Cierra sesión y vuelve a entrar.";
  }
  return crudo.slice(0, 120);
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
