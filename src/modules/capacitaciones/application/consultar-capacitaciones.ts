// Módulo Capacitaciones · APLICACIÓN · Casos de uso de consulta.

import { estaPublicada, type Capacitacion } from "../domain/capacitacion";
import type { FiltrosCapacitaciones, RepositorioCapacitaciones } from "./ports";

export interface Deps {
  repo: RepositorioCapacitaciones;
}

/** Facetas de la biblioteca, derivadas de lo que hay. */
export interface FacetasCapacitaciones {
  categorias: string[];
  niveles: string[];
  softwares: string[];
}

export interface VistaCapacitaciones {
  items: Capacitacion[];
  facetas: FacetasCapacitaciones;
  /** Cuánto material hay en total, para el encabezado. */
  totalTemas: number;
  totalMateriales: number;
}

/**
 * La biblioteca de capacitaciones.
 *
 * Sin avance y sin persona: lo que se ve aquí es lo mismo para todo el equipo.
 * Es una fuente de consulta —"necesito el video de revisiones"— y no un curso
 * que alguien deba completar.
 *
 * Los borradores se descartan en esta capa y no en el repositorio: quien
 * administra sí necesita verlos, y el permiso es una decisión de aplicación.
 */
export async function listarCapacitaciones(
  { repo }: Deps,
  filtros: FiltrosCapacitaciones = {},
): Promise<VistaCapacitaciones> {
  const todas = await repo.listar(filtros);
  const items = filtros.incluirBorradores ? todas : todas.filter(estaPublicada);

  return {
    items,
    facetas: calcularFacetas(items),
    totalTemas: items.reduce((n, c) => n + c.temas.length, 0),
    totalMateriales: items.reduce(
      (n, c) => n + c.temas.reduce((m, t) => m + t.materials.length, 0),
      0,
    ),
  };
}

/** Los valores de filtro presentes, para no fijarlos en una constante. */
export function calcularFacetas(caps: Capacitacion[]): FacetasCapacitaciones {
  const categorias = new Set<string>();
  const niveles = new Set<string>();
  const softwares = new Set<string>();

  for (const c of caps) {
    if (c.category) categorias.add(c.category);
    if (c.level) niveles.add(c.level);
    if (c.software && c.software !== "—") softwares.add(c.software);
  }

  // Los niveles llevan orden propio: alfabético pondría "Avanzado" antes que
  // "Básico", que se lee como un error.
  const ORDEN_NIVEL = ["Básico", "Intermedio", "Avanzado"];

  return {
    categorias: [...categorias].sort((a, b) => a.localeCompare(b, "es")),
    niveles: [...niveles].sort((a, b) => ORDEN_NIVEL.indexOf(a) - ORDEN_NIVEL.indexOf(b)),
    softwares: [...softwares].sort((a, b) => a.localeCompare(b, "es")),
  };
}

/** Una capacitación con todo su material. */
export async function verCapacitacion(
  { repo }: Deps,
  id: string,
): Promise<Capacitacion | null> {
  return repo.porId(id);
}

/** Suma una vista. Se llama al abrir la ficha. */
export async function registrarVista({ repo }: Deps, id: string): Promise<void> {
  await repo.registrarVista(id);
}
