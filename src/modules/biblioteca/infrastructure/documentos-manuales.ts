// Módulo BIBLIOTECA · INFRAESTRUCTURA · Documentos dados de alta a mano.
//
// La biblioteca se llena desde el cronograma de Google Sheets, y eso cubre lo
// que el área de Estandarización planifica. Pero hay material que no nace ahí:
// un instructivo que alguien escribió sobre la marcha, la grabación de una
// sesión, una plantilla que circuló por Slack.
//
// Antes eso obligaba a meterlo en el cronograma aunque no perteneciera, o a
// dejarlo fuera de la biblioteca. Ahora se puede dar de alta directamente.
//
// CONVIVEN SIN PISARSE, y el modelo ya lo tenía previsto: `origin` distingue lo
// que viene del cronograma (`"sheet"`) de lo que se subió a mano (`"manual"`),
// y la clave única es `(code, origin)`. La sincronización solo toca lo suyo
// —está escrito en su código— así que traer el cronograma al día nunca borra
// un documento subido desde aquí.

import "server-only";

import { portalConfigured, portalDb } from "@/lib/portal/db";
import { getDriveClient } from "@/lib/google/client";
import { idDriveDe } from "@/modules/herramientas/domain/descarga";

/** Lo que hace falta para dar de alta un documento. */
export interface DatosDocumento {
  title: string;
  section: string;
  /** El enlace de Drive. De él sale todo lo demás del archivo. */
  enlace: string;
  code?: string | null;
  author?: string | null;
  /** Pendiente · Agendada · Impartida, cuando hay capacitación asociada. */
  training?: string | null;
  position?: number;
}

export class DocumentoError extends Error {}

/**
 * Las secciones que ya existen en la biblioteca.
 *
 * Se ofrecen al dar de alta para que no aparezca un «Estándares» junto a un
 * «Estandares»: el menú lateral agrupa por el texto exacto, así que una tilde
 * de más parte un grupo en dos.
 */
export async function seccionesExistentes(): Promise<string[]> {
  if (!portalConfigured) return [];

  const filas = await portalDb()
    .resource.findMany({
      distinct: ["section"],
      select: { section: true },
      orderBy: { section: "asc" },
    })
    .catch((): { section: string }[] => []);

  return filas.map((f) => f.section).filter(Boolean);
}

/**
 * El siguiente código dentro de una sección: 1.1, 1.2, 1.3…
 *
 * El cronograma numera por secciones, y un documento manual tiene que seguir
 * esa cuenta para no romper el orden. Se mira el MAYOR de la sección, no
 * cuántos hay: si alguno se borró, contar daría un número ya usado.
 *
 * El prefijo —el «1» de «1.4»— se toma de lo que ya haya en esa sección. Una
 * sección nueva empieza por el siguiente entero libre de toda la biblioteca.
 */
export async function siguienteCodigo(section: string): Promise<string> {
  if (!portalConfigured) return "1.1";

  const enSeccion = await portalDb()
    .resource.findMany({
      where: { section },
      select: { code: true },
    })
    .catch((): { code: string | null }[] => []);

  let prefijo: number | null = null;
  let mayor = 0;

  for (const f of enSeccion) {
    const m = f.code?.match(/^(\d+)\.(\d+)$/);
    if (!m) continue;
    prefijo ??= Number(m[1]);
    const sufijo = Number(m[2]);
    if (Number(m[1]) === prefijo && sufijo > mayor) mayor = sufijo;
  }

  if (prefijo !== null) return `${prefijo}.${mayor + 1}`;

  // Sección sin documentos numerados: se busca el primer entero libre.
  const todos = await portalDb()
    .resource.findMany({ select: { code: true } })
    .catch((): { code: string | null }[] => []);

  let mayorPrefijo = 0;
  for (const f of todos) {
    const n = Number(f.code?.match(/^(\d+)\./)?.[1]);
    if (Number.isFinite(n) && n > mayorPrefijo) mayorPrefijo = n;
  }

  return `${mayorPrefijo + 1}.1`;
}

/** Lo que Drive sabe de un archivo y aquí hace falta. */
interface DatosDeDrive {
  driveId: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
}

/**
 * Lo que Drive sabe del archivo: nombre, tipo y tamaño.
 *
 * Se pregunta en vez de pedirlo en el formulario porque es un dato que ya
 * existe y escribirlo a mano solo sirve para equivocarse. Además el tipo decide
 * cómo se pinta la fila —el sello PDF— y el tamaño sale junto al autor, así que
 * sin ellos el documento se vería distinto a los del cronograma.
 *
 * Corre con la cuenta de quien da de alta: si esa persona no puede abrir el
 * archivo, esto falla igual que le fallaría a ella en el navegador.
 */
async function leerDeDrive(enlace: string): Promise<DatosDeDrive> {
  const driveId = idDriveDe(enlace);
  if (!driveId) {
    throw new DocumentoError(
      "Ese enlace no parece de Google Drive. Copia la dirección del archivo desde el navegador.",
    );
  }

  try {
    const drive = await getDriveClient();
    const meta = await drive.files.get({
      fileId: driveId,
      fields: "name,mimeType,size",
      supportsAllDrives: true,
    });

    const tipo = meta.data.mimeType ?? null;

    /*
     * Una carpeta no es un documento.
     *
     * Pasa al copiar el enlace desde la barra de Drive estando dentro de una
     * carpeta en vez de sobre el archivo. Sin esta comprobación se daría de
     * alta una ficha que al abrirse no enseña nada.
     */
    if (tipo === "application/vnd.google-apps.folder") {
      throw new DocumentoError(
        "Ese enlace es de una carpeta, no de un archivo. Abre el documento y copia su enlace.",
      );
    }

    return {
      driveId,
      fileName: meta.data.name ?? null,
      mimeType: tipo,
      sizeBytes: meta.data.size ? Number(meta.data.size) : null,
    };
  } catch (e) {
    if (e instanceof DocumentoError) throw e;

    const motivo = e instanceof Error ? e.message : String(e);

    // Google responde 404 tanto si no existe como si esta cuenta no lo ve, y
    // son dos problemas distintos para quien está dando de alta.
    if (/not found|404|permission|403/i.test(motivo)) {
      throw new DocumentoError(
        "No se pudo abrir ese archivo con tu cuenta. Comprueba que lo tienes compartido.",
      );
    }

    throw new DocumentoError(`Google no dejó leer el archivo: ${motivo.slice(0, 140)}`);
  }
}

/**
 * Da de alta un documento en la biblioteca.
 *
 * Queda con `origin = "manual"`, que es lo que lo protege: la sincronización
 * del cronograma no lo mira, así que sobrevive a cualquier actualización.
 */
export async function crearDocumento(
  datos: DatosDocumento,
  creadoPor: string,
): Promise<string> {
  if (!portalConfigured) throw new DocumentoError("La base de datos no está configurada.");

  const title = datos.title.trim();
  const section = datos.section.trim();

  if (!title) throw new DocumentoError("El documento necesita un título.");
  if (!section) throw new DocumentoError("Elige o escribe una sección.");

  const archivo = await leerDeDrive(datos.enlace);
  const code = datos.code?.trim() || (await siguienteCodigo(section));

  /*
   * ¿Ese código ya está en uso entre los manuales?
   *
   * La base lo rechazaría por el índice único `(code, origin)`, pero el error
   * de Prisma no dice nada útil a quien está dando de alta. Se comprueba antes
   * para poder explicarlo.
   */
  const repetido = await portalDb()
    .resource.findFirst({
      where: { code, origin: "manual" },
      select: { title: true },
    })
    .catch(() => null);

  if (repetido) {
    throw new DocumentoError(
      `El código ${code} ya lo usa «${repetido.title}». Déjalo vacío para que se asigne el siguiente libre.`,
    );
  }

  const creado = await portalDb().resource.create({
    data: {
      code,
      title,
      section,
      position: datos.position ?? 0,
      fileName: archivo.fileName,
      driveId: archivo.driveId,
      url: `https://drive.google.com/file/d/${archivo.driveId}/view`,
      mimeType: archivo.mimeType,
      sizeBytes: archivo.sizeBytes,
      author: datos.author?.trim() || null,
      training: datos.training?.trim() || null,
      origin: "manual",
      createdBy: creadoPor,
    },
    select: { id: true },
  });

  return creado.id;
}

/**
 * Cambia un documento dado de alta a mano.
 *
 * SOLO los manuales: un documento del cronograma se corrige en el Sheets, y
 * editarlo aquí duraría hasta la siguiente sincronización, que lo devolvería a
 * como está en la hoja. Peor que no poder editarlo es poder hacerlo y que se
 * deshaga solo.
 */
export async function editarDocumento(
  id: string,
  datos: Partial<DatosDocumento>,
): Promise<void> {
  if (!portalConfigured) throw new DocumentoError("La base de datos no está configurada.");

  const actual = await portalDb()
    .resource.findUnique({ where: { id }, select: { origin: true } })
    .catch(() => null);

  if (!actual) throw new DocumentoError("Ese documento ya no existe.");
  if (actual.origin !== "manual") {
    throw new DocumentoError(
      "Ese documento viene del cronograma. Corrígelo en la hoja y sincroniza; " +
        "editarlo aquí se desharía en la siguiente sincronización.",
    );
  }

  const cambios: Record<string, unknown> = {};

  if (datos.title !== undefined) cambios.title = datos.title.trim();
  if (datos.section !== undefined) cambios.section = datos.section.trim();
  if (datos.code !== undefined) cambios.code = datos.code?.trim() || null;
  if (datos.author !== undefined) cambios.author = datos.author?.trim() || null;
  if (datos.training !== undefined) cambios.training = datos.training?.trim() || null;

  // El enlace solo se relee si cambió: preguntar a Drive en cada guardado
  // costaría una llamada por nada cuando solo se corrige un título.
  if (datos.enlace !== undefined && datos.enlace.trim()) {
    const archivo = await leerDeDrive(datos.enlace);
    cambios.driveId = archivo.driveId;
    cambios.url = `https://drive.google.com/file/d/${archivo.driveId}/view`;
    cambios.fileName = archivo.fileName;
    cambios.mimeType = archivo.mimeType;
    cambios.sizeBytes = archivo.sizeBytes;
  }

  await portalDb().resource.update({ where: { id }, data: cambios });
}

/** Retira un documento dado de alta a mano. */
export async function borrarDocumento(id: string): Promise<void> {
  if (!portalConfigured) throw new DocumentoError("La base de datos no está configurada.");

  const actual = await portalDb()
    .resource.findUnique({
      where: { id },
      select: { origin: true, _count: { select: { enRutas: true, enFaq: true } } },
    })
    .catch(() => null);

  if (!actual) throw new DocumentoError("Ese documento ya no existe.");
  if (actual.origin !== "manual") {
    throw new DocumentoError("Ese documento viene del cronograma; quítalo de la hoja.");
  }

  /*
   * No se borra lo que otra cosa usa.
   *
   * Un documento puede estar dentro de una ruta de aprendizaje o citado por una
   * ficha del FAQ. Borrarlo dejaría esa ruta con un hueco y esa ficha
   * apuntando a nada, sin que nadie se entere hasta que alguien la abra.
   */
  const { enRutas, enFaq } = actual._count;
  if (enRutas > 0 || enFaq > 0) {
    const usos = [
      enRutas > 0 ? `${enRutas} ${enRutas === 1 ? "ruta" : "rutas"}` : null,
      enFaq > 0 ? `${enFaq} ${enFaq === 1 ? "ficha del FAQ" : "fichas del FAQ"}` : null,
    ]
      .filter(Boolean)
      .join(" y ");

    throw new DocumentoError(`No se puede borrar: lo usa ${usos}. Quítalo de ahí primero.`);
  }

  await portalDb().resource.delete({ where: { id } });
}

/** Lo dado de alta a mano, para el listado de Administración. */
export async function listarManuales() {
  if (!portalConfigured) return [];

  return portalDb()
    .resource.findMany({
      where: { origin: "manual" },
      orderBy: [{ section: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        title: true,
        section: true,
        fileName: true,
        sizeBytes: true,
        mimeType: true,
        author: true,
        training: true,
        driveId: true,
        createdBy: true,
        updatedAt: true,
      },
    })
    .catch(() => []);
}
