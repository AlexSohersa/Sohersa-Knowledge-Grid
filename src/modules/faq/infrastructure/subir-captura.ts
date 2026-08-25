import "server-only";

import { getDriveClient } from "@/lib/google/client";
import { Readable } from "node:stream";

/**
 * Guarda una captura en Drive, no en la base.
 *
 * POR QUÉ EN DRIVE. Una captura pesa entre 50 KB y 1 MB; setenta y ocho fichas
 * con su imagen serían decenas de megabytes dentro de la base de datos, que
 * comparten las cuatro herramientas. Drive ya es donde vive todo el material
 * del equipo, y guardar ahí significa que la imagen se puede abrir, mover o
 * corregir desde el propio Drive sin tocar la aplicación.
 *
 * CÓMO SE ORGANIZA. Se crea sola una jerarquía por categoría y subcategoría:
 *
 *   FAQ Web
 *     └── Revit
 *           └── Archivos y modelo
 *                 └── RVT-004.png
 *
 * Así la carpeta de Drive se lee igual que los filtros de la pantalla, y quien
 * entre a Drive a buscar algo no necesita saber cómo funciona la aplicación.
 *
 * LOS NOMBRES SE PONEN SOLOS. El archivo se llama como su código de ficha
 * —`RVT-004.png`— y no como el archivo que subió la persona, que suele ser
 * `Captura de pantalla 2026-08-25 a las 11.32.14.png`. Cuando la ficha todavía
 * no tiene código —una propuesta— se usa un nombre derivado del título.
 *
 * NO SE DUPLICA. Antes de crear una carpeta se busca; antes de subir un archivo
 * con el mismo nombre en el mismo sitio, se ACTUALIZA el que ya está. Repetir
 * la subida de una ficha deja una sola imagen, no cinco versiones.
 */

/**
 * LA CARPETA MADRE: «FAQ Web».
 *
 * Todas las capturas del portal cuelgan de aquí. Es una carpeta propia de la
 * plataforma, aparte de «Base de datos FAQ Sohersa» —la del área, donde vive su
 * Excel y sus imágenes de trabajo—: así lo que publica la aplicación no se
 * mezcla con lo que el área mantiene a mano, y ninguno de los dos estorba al
 * otro.
 *
 * Fijarla por ID importa. Si se buscara por NOMBRE, la carpeta se crearía en
 * «Mi unidad» de quien subiera la primera captura, y las imágenes acabarían
 * repartidas por unidades personales —invisibles para el resto del equipo y
 * perdidas el día que esa persona se vaya—.
 */
export const CARPETA_MADRE = "13262OdOhSyCaoxv9eAIaq211znIthl3n";

/** Lo que Drive acepta como captura. */
const TIPOS = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]);

/** Tope por archivo. Una captura de pantalla nunca pesa tanto. */
const MAX_BYTES = 8 * 1024 * 1024;

export class CapturaError extends Error {}

type Drive = Awaited<ReturnType<typeof getDriveClient>>;

/**
 * Busca una carpeta por nombre dentro de otra, y la crea si no existe.
 *
 * La búsqueda va primero SIEMPRE: sin ella, cada subida crearía otra carpeta
 * «Revit» junto a la anterior —Drive permite nombres repetidos— y en un mes
 * habría veinte carpetas iguales.
 */
export async function carpeta(drive: Drive, nombre: string, padre?: string): Promise<string> {
  const escapado = nombre.replace(/'/g, "\\'");
  const q = [
    `name = '${escapado}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    padre ? `'${padre}' in parents` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  const encontrada = await drive.files.list({
    q,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const ya = encontrada.data.files?.[0]?.id;
  if (ya) return ya;

  const creada = await drive.files.create({
    requestBody: {
      name: nombre,
      mimeType: "application/vnd.google-apps.folder",
      ...(padre ? { parents: [padre] } : {}),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const id = creada.data.id;
  if (!id) throw new CapturaError(`No se pudo crear la carpeta «${nombre}» en Drive.`);
  return id;
}

/**
 * Deja un nombre de carpeta utilizable.
 *
 * Drive admite casi cualquier cosa, pero una barra en el nombre confunde a
 * quien lo lee como si fuera una ruta, y los espacios de sobra crean carpetas
 * que parecen iguales y no lo son.
 */
function limpiarNombre(s: string): string {
  return s.replace(/[\\/]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "Sin clasificar";
}

/** La extensión que toca, a partir del tipo real del archivo. */
function extensionDe(tipo: string): string {
  if (tipo === "image/jpeg" || tipo === "image/jpg") return ".jpg";
  if (tipo === "image/gif") return ".gif";
  if (tipo === "image/webp") return ".webp";
  return ".png";
}

/**
 * Convierte un título en algo que sirva de nombre de archivo.
 *
 * Solo se usa cuando la ficha aún no tiene código —una propuesta recién
 * mandada—: en cuanto el área le asigne el suyo, la imagen se puede renombrar
 * desde Drive.
 */
function nombreDesdeTitulo(titulo: string): string {
  return (
    titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "captura"
  );
}

export interface CapturaSubida {
  driveId: string;
  nombre: string;
}

/**
 * Sube una captura y devuelve dónde quedó.
 *
 * Se usa la cuenta de QUIEN SUBE, como todo lo demás que toca Drive aquí: el
 * archivo queda a su nombre y hereda los permisos de la carpeta.
 */
export async function subirCaptura(
  archivo: File,
  destino: {
    /** El código de la ficha, si lo tiene: `RVT-004`. */
    codigo?: string | null;
    /** El primer nivel de carpeta. En la pantalla se llama «categoría». */
    categoria?: string | null;
    /** El segundo nivel. En la pantalla, «subcategoría». */
    subcategoria?: string | null;
    /** Para nombrar el archivo cuando todavía no hay código. */
    titulo: string;
  },
): Promise<CapturaSubida> {
  if (!TIPOS.has(archivo.type)) {
    throw new CapturaError("La captura tiene que ser una imagen (PNG, JPG, GIF o WEBP).");
  }
  if (archivo.size > MAX_BYTES) {
    throw new CapturaError("La imagen pesa demasiado. Prueba con una captura más pequeña.");
  }

  const drive = await getDriveClient();

  /*
   * La jerarquía, de fuera hacia dentro. Cada nivel se busca antes de crearse,
   * así que dos personas subiendo a la vez a la misma categoría acaban en la
   * misma carpeta y no en dos.
   */
  /*
   * Quien sube necesita permiso de edición sobre «FAQ Web». Si no lo tiene,
   * Drive rechaza la creación de la carpeta y el error sube con su motivo.
   */
  const madre = process.env.FAQ_CAPTURAS_CARPETA ?? CARPETA_MADRE;

  const raiz = madre;

  let padre = raiz;
  if (destino.categoria) padre = await carpeta(drive, limpiarNombre(destino.categoria), padre);
  if (destino.subcategoria) padre = await carpeta(drive, limpiarNombre(destino.subcategoria), padre);

  const base = destino.codigo?.trim().toUpperCase() || nombreDesdeTitulo(destino.titulo);
  const nombre = `${base}${extensionDe(archivo.type)}`;

  const cuerpo = Readable.from(Buffer.from(await archivo.arrayBuffer()));

  /*
   * Si ya hay un archivo con ese nombre ahí, se REEMPLAZA su contenido en vez
   * de crear otro. Reintentar una subida —o corregir la captura de una ficha—
   * deja una sola imagen, y el `driveId` no cambia, así que lo que ya apuntaba
   * a ella sigue funcionando.
   */
  const previo = await drive.files.list({
    q: `name = '${nombre.replace(/'/g, "\\'")}' and '${padre}' in parents and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const yaEsta = previo.data.files?.[0]?.id;

  if (yaEsta) {
    await drive.files.update({
      fileId: yaEsta,
      media: { mimeType: archivo.type, body: cuerpo },
      supportsAllDrives: true,
    });
    return { driveId: yaEsta, nombre };
  }

  const creado = await drive.files.create({
    requestBody: { name: nombre, parents: [padre] },
    media: { mimeType: archivo.type, body: cuerpo },
    fields: "id",
    supportsAllDrives: true,
  });

  const id = creado.data.id;
  if (!id) throw new CapturaError("Drive no devolvió el archivo subido.");

  return { driveId: id, nombre };
}


/**
 * La carpeta de un nivel, con el nombre ya normalizado.
 *
 * Existe para que subir una captura y reordenar el catálogo usen exactamente la
 * misma regla: si una de las dos limpiara el nombre distinto, acabarían
 * creándose dos carpetas «Archivos y modelo» que parecen la misma.
 */
export async function carpetaDe(
  drive: Drive,
  nombre: string,
  padre: string,
): Promise<string> {
  return carpeta(drive, limpiarNombre(nombre), padre);
}

export type { Drive };

/**
 * Mueve una captura a la carpeta que le toca, y la renombra si ya tiene código.
 *
 * Se usa al aprobar una propuesta: quien la mandó clasificó como pudo —muchas
 * veces sin saber en qué categoría entra— y el administrador lo corrige al
 * revisarla. La imagen tiene que seguir esa corrección; si no, la carpeta de
 * Drive acabaría diciendo una cosa y la ficha otra.
 *
 * Devuelve el id, que NO cambia al mover: lo que ya apuntaba a la imagen sigue
 * funcionando. Si algo falla, devuelve `null` y quien llama se queda con el id
 * de antes: una imagen en la carpeta equivocada es mejor que perderla.
 */
export async function reubicarCaptura(
  driveId: string,
  destino: { codigo?: string | null; categoria?: string | null; subcategoria?: string | null },
): Promise<string | null> {
  try {
    const drive = await getDriveClient();

    const actual = await drive.files.get({
      fileId: driveId,
      fields: "parents,name,mimeType",
      supportsAllDrives: true,
    });

    let padre = CARPETA_MADRE;
    if (destino.categoria) padre = await carpetaDe(drive, destino.categoria, padre);
    if (destino.subcategoria) padre = await carpetaDe(drive, destino.subcategoria, padre);

    const nombreActual = actual.data.name ?? "";
    const extension = nombreActual.includes(".")
      ? nombreActual.slice(nombreActual.lastIndexOf("."))
      : extensionDe(actual.data.mimeType ?? "image/png");

    // Con código, el archivo pasa a llamarse como la ficha. Sin él se conserva
    // el nombre: renombrarlo a algo derivado del título solo añadiría ruido.
    const nombre = destino.codigo ? `${destino.codigo}${extension}` : nombreActual;

    const padresViejos = actual.data.parents ?? [];
    const yaEsta = padresViejos.includes(padre);

    if (yaEsta && nombre === nombreActual) return driveId;

    await drive.files.update({
      fileId: driveId,
      ...(yaEsta ? {} : { addParents: padre, removeParents: padresViejos.join(",") }),
      requestBody: nombre !== nombreActual ? { name: nombre } : {},
      fields: "id",
      supportsAllDrives: true,
    });

    return driveId;
  } catch {
    return null;
  }
}
