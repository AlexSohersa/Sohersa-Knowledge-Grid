import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getDriveClient, GoogleAuthError } from "@/lib/google/client";
import { usuarioActual } from "@/lib/grid/session";
import { gridConfigured, gridDb } from "@/lib/grid/db";

/**
 * Descarga el archivo de una herramienta DESDE LA PLATAFORMA.
 *
 * Antes el botón redirigía a `drive.google.com/uc?export=download`. Con un
 * archivo privado eso no descarga nada: Drive responde con su página de inicio
 * de sesión o de «no tienes acceso», y con los `.zip` grandes intercala además
 * el aviso del antivirus. Quien pulsaba acababa en una pestaña de Drive.
 *
 * Aquí el archivo se pide desde el SERVIDOR, con la cuenta de quien descarga
 * —igual que las imágenes de `/api/imagen`—, y se le entrega como adjunto con
 * su nombre. La regla de la plataforma se conserva: cada quien baja lo que ya
 * puede abrir en Drive, y esta ruta no amplía permisos.
 *
 * El archivo viaja EN FLUJO, sin cargarlo entero en memoria: un zip de cientos
 * de megas cabría mal en una función de Vercel.
 *
 * Un enlace que no es de Drive —la página de un fabricante— no se puede traer:
 * se redirige a él, como antes.
 */

export const runtime = "nodejs";

/** Lo que Vercel deja vivir a la función mientras el archivo sale. */
export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ficha = `/herramientas/${encodeURIComponent(id)}`;

  // Una ruta que sirve archivos comprueba la sesión por su cuenta: es la clase
  // de URL que alguien pega en otro sitio.
  const yo = await usuarioActual();
  if (!yo) return new NextResponse("Se necesita sesión.", { status: 401 });

  if (!gridConfigured) return volver(req, ficha);

  /*
   * El destino se lee de la base y nunca de la petición: si viniera en la URL,
   * esto sería un redirector abierto con el dominio de la empresa.
   */
  const h = await gridDb()
    .tool.findUnique({
      where: { id },
      select: { downloadUrl: true, driveFileId: true, fileName: true },
    })
    .catch(() => null);

  if (!h) return volver(req, "/herramientas");

  if (!h.driveFileId) {
    const externo = h.downloadUrl?.trim();
    if (!externo || !/^https?:\/\//i.test(externo)) return volver(req, ficha);
    await contar(id);
    return NextResponse.redirect(externo);
  }

  try {
    const drive = await getDriveClient();

    const meta = await drive.files.get({
      fileId: h.driveFileId,
      fields: "name,size,mimeType",
      supportsAllDrives: true,
    });

    /*
     * Una carpeta o un documento nativo de Google no tienen bytes que bajar:
     * `alt=media` falla con ellos. Se devuelve a la ficha con el aviso en vez
     * de dejar que la descarga muera con un error de Google.
     */
    const tipo = meta.data.mimeType ?? "application/octet-stream";
    if (tipo.startsWith("application/vnd.google-apps.")) {
      console.error(`[descarga] ${id}: ${h.driveFileId} es ${tipo}, no un archivo`);
      return volver(req, ficha, "tipo");
    }

    const archivo = await drive.files.get(
      { fileId: h.driveFileId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" },
    );

    await contar(id);

    // El nombre de Drive manda: es el del archivo real, con su extensión. El
    // que se escribió a mano en el formulario queda como respaldo.
    const nombre = meta.data.name || h.fileName || "descarga";

    const headers: Record<string, string> = {
      "Content-Type": tipo,
      "Content-Disposition": disposicion(nombre),
      "Cache-Control": "private, no-store",
    };
    if (meta.data.size) headers["Content-Length"] = meta.data.size;

    return new NextResponse(
      Readable.toWeb(archivo.data as Readable) as ReadableStream<Uint8Array>,
      { headers },
    );
  } catch (e) {
    /*
     * El motivo queda en el registro. Desde fuera todo fallo se ve igual
     * —permisos, archivo movido, token caducado— y sin esto no hay forma de
     * saber cuál fue. Se registra el id, nunca el contenido.
     */
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[descarga] ${id} (${h.driveFileId}): ${motivo}`);

    return volver(req, ficha, e instanceof GoogleAuthError ? "sesion" : "acceso");
  }
}

/**
 * De vuelta a la ficha, con el motivo en la URL para que la ficha lo explique.
 * Una página de error suelta dejaría a la persona fuera de la aplicación.
 */
function volver(req: Request, ruta: string, motivo?: string) {
  const url = new URL(ruta, req.url);
  if (motivo) url.searchParams.set("descarga", motivo);
  return NextResponse.redirect(url);
}

/**
 * Cuenta la descarga. El contador no vale la descarga: si la base falla, la
 * persona recibe su archivo igual, por eso se traga el error.
 */
async function contar(id: string) {
  await gridDb()
    .tool.update({ where: { id }, data: { downloads: { increment: 1 } } })
    .catch(() => undefined);
}

/**
 * `attachment` con el nombre en las dos formas: la ASCII para navegadores
 * viejos y la UTF-8 (RFC 5987) para que «Tablas de áreas.zip» llegue con su
 * acento.
 */
function disposicion(nombre: string): string {
  const ascii = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}
