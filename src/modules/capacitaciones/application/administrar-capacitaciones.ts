// Módulo Capacitaciones · APLICACIÓN · Casos de uso de escritura.
//
// Solo administración: crear cursos, agregarles temas y colgarles material. No
// hay nada de avance —una capacitación es material de consulta— y el registro
// de vistas vive en `consultar-capacitaciones.ts`, junto a la lectura.

import type {
  DatosCapacitacion,
  DatosMaterial,
  DatosTema,
  RepositorioCapacitaciones,
} from "./ports";

export interface Deps {
  repo: RepositorioCapacitaciones;
}

/* ── Administración ─────────────────────────────────────────────────────── */

/**
 * Crear una capacitación.
 *
 * Nace en BORRADOR salvo que se diga lo contrario: publicar es una decisión
 * aparte, y una capacitación recién creada todavía no tiene temas, así que
 * enseñarla sería enseñar un curso vacío.
 */
export async function crearCapacitacion(
  { repo }: Deps,
  datos: DatosCapacitacion,
  creadaPor: string,
): Promise<string> {
  return repo.crear({ status: "BORRADOR", ...datos }, creadaPor);
}

export async function editarCapacitacion(
  { repo }: Deps,
  id: string,
  datos: Partial<DatosCapacitacion>,
): Promise<void> {
  await repo.editar(id, datos);
}

/**
 * Publicar una capacitación.
 *
 * Se exige al menos un tema: publicar un curso sin contenido lo pone en la
 * biblioteca, alguien lo abre y no hay nada. Mejor impedirlo aquí que explicarlo
 * después.
 */
export async function publicarCapacitacion(
  { repo }: Deps,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const cap = await repo.porId(id);
  if (!cap) return { ok: false, error: "La capacitación ya no existe." };
  if (cap.temas.length === 0) {
    return { ok: false, error: "Agrega al menos un tema antes de publicarla." };
  }
  await repo.editar(id, { status: "PUBLICADA" });
  return { ok: true };
}

/** Retirarla de la biblioteca sin borrarla: el avance de la gente se conserva. */
export async function archivarCapacitacion({ repo }: Deps, id: string): Promise<void> {
  await repo.editar(id, { status: "ARCHIVADA" });
}

export async function eliminarCapacitacion({ repo }: Deps, id: string): Promise<void> {
  await repo.eliminar(id);
}

export async function agregarTema(
  { repo }: Deps,
  capId: string,
  datos: DatosTema,
): Promise<string> {
  return repo.agregarTema(capId, datos);
}

export async function editarTema(
  { repo }: Deps,
  temaId: string,
  datos: Partial<DatosTema>,
): Promise<void> {
  await repo.editarTema(temaId, datos);
}

export async function eliminarTema({ repo }: Deps, temaId: string): Promise<void> {
  await repo.eliminarTema(temaId);
}

export async function agregarMaterial(
  { repo }: Deps,
  temaId: string,
  datos: DatosMaterial,
): Promise<string> {
  return repo.agregarMaterial(temaId, datos);
}

export async function eliminarMaterial({ repo }: Deps, materialId: string): Promise<void> {
  await repo.eliminarMaterial(materialId);
}
