// Módulo Biblioteca · APLICACIÓN · Casos de uso de consulta.
//
// Orquestan el repositorio y las reglas del dominio. No conocen Prisma ni Next.

import {
  ordenSeccion,
  type Documento,
  type SeccionDocumentos,
} from "../domain/documento";
import type {
  Automatizacion,
  FiltrosBiblioteca,
  PermisosBiblioteca,
  RepositorioBiblioteca,
} from "./ports";

export interface Dependencias {
  repo: RepositorioBiblioteca;
  permisos: PermisosBiblioteca;
}

export interface VistaBiblioteca {
  secciones: SeccionDocumentos[];
  total: number;
  /** Si esta persona ve los campos de gestión. La UI lo necesita para decidir
   *  si pinta la columna de avance y prioridad. */
  verInterno: boolean;
  /** Los valores disponibles para los filtros, derivados de lo que hay. */
  facetas: Facetas;
  ultimaSync: Date | null;
}

/**
 * Los valores por los que se puede filtrar.
 *
 * Se calculan de los documentos reales en vez de fijarlos en una constante:
 * así, cuando el cronograma gana una sección nueva, aparece sola en el filtro y
 * nadie tiene que acordarse de añadirla al código.
 */
export interface Facetas {
  secciones: string[];
  extensiones: string[];
  autores: string[];
}

/**
 * La biblioteca completa que ve una persona.
 *
 * El filtrado de campos internos ocurre en el REPOSITORIO —es decir, en el
 * servidor— y no ocultando columnas en la interfaz: si esos campos viajaran al
 * navegador, cualquiera podría leerlos en el código fuente de la página. Aquí
 * solo se decide QUIÉN los recibe.
 */
export async function listarBiblioteca(
  { repo, permisos }: Dependencias,
  email: string,
  filtros: FiltrosBiblioteca = {},
): Promise<VistaBiblioteca> {
  const verInterno = await permisos.puedeVerInterno(email);

  const [docs, ultimaSync] = await Promise.all([
    repo.listar(filtros, verInterno),
    repo.ultimaSincronizacion(),
  ]);

  return {
    secciones: agruparPorSeccion(docs),
    total: docs.length,
    verInterno,
    facetas: calcularFacetas(docs),
    ultimaSync,
  };
}

/**
 * Agrupa documentos por sección, en el orden del cronograma.
 *
 * Pura y exportada para poder probarla y reutilizarla desde la búsqueda global,
 * que necesita el mismo agrupado sobre otro conjunto de documentos.
 */
export function agruparPorSeccion(docs: Documento[]): SeccionDocumentos[] {
  const porSeccion = new Map<string, Documento[]>();

  for (const doc of docs) {
    const lista = porSeccion.get(doc.section) ?? [];
    lista.push(doc);
    porSeccion.set(doc.section, lista);
  }

  return [...porSeccion.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => ordenSeccion(a) - ordenSeccion(b));
}

/** Los valores de filtro presentes en un conjunto de documentos. */
export function calcularFacetas(docs: Documento[]): Facetas {
  const secciones = new Set<string>();
  const extensiones = new Set<string>();
  const autores = new Set<string>();

  for (const doc of docs) {
    secciones.add(doc.section);
    if (doc.author) autores.add(doc.author);
    const ext = doc.fileName?.match(/\.([a-z0-9]+)$/i)?.[1];
    if (ext) extensiones.add(ext.toUpperCase());
  }

  return {
    secciones: [...secciones].sort((a, b) => a.localeCompare(b, "es")),
    extensiones: [...extensiones].sort(),
    autores: [...autores].sort((a, b) => a.localeCompare(b, "es")),
  };
}

/** Un documento por su código del cronograma, con permisos ya resueltos. */
export async function verDocumento(
  { repo, permisos }: Dependencias,
  email: string,
  code: string,
): Promise<Documento | null> {
  const verInterno = await permisos.puedeVerInterno(email);
  return repo.porCodigo(code, verInterno);
}

/** Las automatizaciones, opcionalmente de una categoría. */
export async function listarAutomatizaciones(
  { repo }: Pick<Dependencias, "repo">,
  categoria?: string,
): Promise<Automatizacion[]> {
  return repo.listarAutomatizaciones(categoria);
}
