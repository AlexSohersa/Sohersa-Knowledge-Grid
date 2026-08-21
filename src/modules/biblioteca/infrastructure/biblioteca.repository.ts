// Módulo Biblioteca · INFRAESTRUCTURA · Repositorio Prisma.
//
// La única capa que conoce Prisma. Lee `grid.Resource`, que ES DE ESTA
// HERRAMIENTA: el módulo de Recursos se retiró de Digital Core y la biblioteca
// vive aquí, sincronizada desde el cronograma en Google Sheets.

import "server-only";

import { portalConfigured, portalDb } from "@/lib/portal/db";
import { coincide, normalizar, type Documento } from "../domain/documento";
import { SYNC_TARGET } from "./sync-cronograma";
import type {
  Automatizacion,
  FiltrosBiblioteca,
  PermisosBiblioteca,
  RepositorioBiblioteca,
} from "../application/ports";

/** La fila cruda de Prisma, con los campos que se consultan. */
type FilaResource = {
  id: string;
  code: string | null;
  title: string;
  section: string;
  fileName: string | null;
  driveId: string | null;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  author: string | null;
  training: string | null;
  origin: string;
  updatedAt: Date;
  priority: string | null;
  required: boolean;
  notes: string | null;
  progress: number | null;
};

/**
 * Pasa una fila a documento, quitando los campos internos si no toca.
 *
 * El recorte ocurre AQUÍ, en el servidor, y no en la interfaz: un campo que no
 * se incluye en el objeto no viaja al navegador y no se puede leer en el código
 * fuente de la página. Ocultarlo con CSS sería solo apariencia.
 */
function aDocumento(fila: FilaResource, verInterno: boolean): Documento {
  const doc: Documento = {
    id: fila.id,
    code: fila.code,
    title: fila.title,
    section: fila.section,
    fileName: fila.fileName,
    driveId: fila.driveId,
    url: fila.url,
    mimeType: fila.mimeType,
    sizeBytes: fila.sizeBytes,
    author: fila.author,
    training: fila.training,
    origin: fila.origin,
    updatedAt: fila.updatedAt,
  };

  if (verInterno) {
    doc.priority = fila.priority;
    doc.required = fila.required;
    doc.notes = fila.notes;
    doc.progress = fila.progress;
  }

  return doc;
}

export const repositorioBiblioteca: RepositorioBiblioteca = {
  async listar(filtros: FiltrosBiblioteca, verInterno: boolean): Promise<Documento[]> {
    if (!portalConfigured) return [];

    /*
     * Los filtros que Postgres puede resolver van en el `where`; la búsqueda de
     * texto se hace en memoria.
     *
     * Es deliberado: el cronograma tiene decenas de documentos, no millones, y
     * la comparación sin acentos que espera la gente —"cuantificacion" debe
     * encontrar "cuantificación"— exige `unaccent`, una extensión que no está
     * garantizada en la base. Filtrar aquí da el resultado correcto sin
     * depender de la instalación.
     */
    const filas = await portalDb()
      .resource.findMany({
        where: {
          ...(filtros.seccion ? { section: filtros.seccion } : {}),
          ...(filtros.autor ? { author: filtros.autor } : {}),
        },
        orderBy: [{ section: "asc" }, { position: "asc" }],
      })
      .catch(() => [] as FilaResource[]);

    let docs = filas.map((f) => aDocumento(f, verInterno));

    if (filtros.busqueda?.trim()) {
      docs = docs.filter((d) => coincide(d, filtros.busqueda!));
    }

    if (filtros.extension) {
      const ext = filtros.extension.toUpperCase();
      docs = docs.filter(
        (d) => (d.fileName?.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toUpperCase() === ext,
      );
    }

    return docs;
  },

  async porCodigo(code: string, verInterno: boolean): Promise<Documento | null> {
    if (!portalConfigured) return null;
    const fila = await portalDb()
      .resource.findFirst({ where: { code } })
      .catch(() => null);
    return fila ? aDocumento(fila, verInterno) : null;
  },

  async porId(id: string, verInterno: boolean): Promise<Documento | null> {
    if (!portalConfigured) return null;
    const fila = await portalDb()
      .resource.findUnique({ where: { id } })
      .catch(() => null);
    return fila ? aDocumento(fila, verInterno) : null;
  },

  async listarAutomatizaciones(categoria?: string): Promise<Automatizacion[]> {
    if (!portalConfigured) return [];
    const filas = await portalDb()
      .automation.findMany({
        where: categoria && categoria !== "todas" ? { category: categoria } : undefined,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []);

    return filas.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      fileName: a.fileName,
      url: a.url,
      version: a.version,
      compat: a.compat,
      sizeBytes: a.sizeBytes,
      downloads: a.downloads,
      createdBy: a.createdBy,
      updatedAt: a.updatedAt,
    }));
  },

  async ultimaSincronizacion(): Promise<Date | null> {
    if (!portalConfigured) return null;
    const fila = await portalDb()
      .syncLog.findFirst({
        // Solo las nuestras: el portal registra las suyas en la misma tabla.
        where: { target: SYNC_TARGET, ok: true },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
      .catch(() => null);
    return fila?.createdAt ?? null;
  },
};

/**
 * Permisos de la biblioteca.
 *
 * Ve los campos de gestión quien administra la PLATAFORMA. Se lee `es_admin`
 * del padrón en vez de mantener una segunda lista: esa bandera ya distingue
 * dirección del resto del equipo, y duplicarla obligaría a actualizar dos
 * sitios cada vez que alguien cambia de puesto.
 *
 * Es distinto de `GridAdmin`, que dice quién administra ESTA herramienta.
 *
 * Se busca por `persona_correo` para que funcione con los correos alternos.
 */
export const permisosBiblioteca: PermisosBiblioteca = {
  async puedeVerInterno(email: string): Promise<boolean> {
    if (!email || !portalConfigured) return false;
    const persona = await portalDb()
      .persona.findFirst({
        where: { correos: { some: { correo: email.toLowerCase() } } },
        select: { es_admin: true },
      })
      .catch(() => null);
    return Boolean(persona?.es_admin);
  },
};

/** Reexportada para que la búsqueda global comparta la misma normalización. */
export { normalizar };
