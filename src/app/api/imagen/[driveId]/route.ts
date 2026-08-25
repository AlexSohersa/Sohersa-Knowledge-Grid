import { NextResponse } from "next/server";
import { getDriveClient, GoogleAuthError } from "@/lib/google/client";
import { usuarioActual } from "@/lib/grid/session";

/**
 * Sirve una imagen de Drive para poder pintarla con `<img src="…">`.
 *
 * POR QUÉ HACE FALTA ESTO. Las capturas de las fichas viven en Drive y son
 * PRIVADAS. Las URL públicas que uno esperaría —`drive.google.com/uc`,
 * `/thumbnail`, `lh3.googleusercontent.com/d/…`— responden con una página de
 * inicio de sesión en HTML, no con la imagen: un `<img>` apuntando ahí sale
 * roto. Se comprobó con las tres.
 *
 * Así que la imagen se pide desde el SERVIDOR, con la cuenta de quien está
 * mirando, y se reenvía al navegador. Eso conserva la regla de toda la
 * plataforma: cada quien ve exactamente los archivos a los que ya tiene acceso
 * en Drive. Esta ruta no amplía permisos —si alguien no puede abrir la imagen
 * en Drive, aquí recibe un 404 igual—.
 *
 * El `driveId` va en la ruta y no como parámetro para que la URL sea estable y
 * el navegador pueda cachearla por sí sola.
 */

/** Un día en el caché del navegador, y una semana sirviendo lo viejo. */
const CACHE = "private, max-age=86400, stale-while-revalidate=604800";

/** Los ids de Drive son alfanuméricos con guiones; nada más entra. */
const ID_VALIDO = /^[A-Za-z0-9_-]{10,120}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ driveId: string }> },
) {
  const { driveId } = await params;

  /*
   * Sesión obligatoria. El middleware ya protege la aplicación, pero una ruta
   * de API que sirve archivos tiene que comprobarlo por su cuenta: es
   * exactamente la clase de URL que alguien pega en otro sitio.
   */
  const yo = await usuarioActual();
  if (!yo) {
    return new NextResponse("Se necesita sesión.", { status: 401 });
  }

  if (!ID_VALIDO.test(driveId)) {
    return new NextResponse("Identificador de archivo inválido.", { status: 400 });
  }

  try {
    const drive = await getDriveClient();

    /*
     * El tipo se PREGUNTA, no se deduce de la respuesta de la descarga.
     *
     * Leerlo de `archivo.headers["content-type"]` parecía lo natural y no
     * funciona: en esta versión de `googleapis` esa propiedad no es un objeto
     * plano, así que el acceso por corchetes daba `undefined` y TODAS las
     * imágenes se rechazaban con un 415 —«no es una imagen»— aunque la descarga
     * hubiera ido perfectamente. Pedir los metadatos deja el dato explícito.
     */
    const meta = await drive.files.get({
      fileId: driveId,
      fields: "mimeType",
      supportsAllDrives: true,
    });

    const tipo = meta.data.mimeType ?? "";
    if (!tipo.startsWith("image/")) {
      return new NextResponse("El archivo no es una imagen.", { status: 415 });
    }

    const archivo = await drive.files.get(
      { fileId: driveId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" },
    );

    return new NextResponse(Buffer.from(archivo.data as ArrayBuffer), {
      headers: { "Content-Type": tipo, "Cache-Control": CACHE },
    });
  } catch (e) {
    /*
     * El motivo queda en el registro del servidor.
     *
     * Una imagen que no carga se ve igual desde fuera falle por lo que falle
     * —permisos, archivo movido, token caducado— y sin esto no hay forma de
     * saber cuál de las tres fue. Se registra el id, nunca el contenido.
     */
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[imagen] ${driveId}: ${motivo}`);

    if (e instanceof GoogleAuthError) {
      return new NextResponse(e.message, { status: 403 });
    }

    /*
     * Un 404 de Drive significa «no existe o no tienes acceso», y Google no
     * distingue entre las dos a propósito. Se reenvía igual: decir «existe
     * pero no puedes verla» ya sería filtrar algo.
     */
    return new NextResponse("No se pudo abrir la imagen.", { status: 404 });
  }
}
