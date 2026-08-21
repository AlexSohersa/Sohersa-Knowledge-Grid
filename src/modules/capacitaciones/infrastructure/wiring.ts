// Módulo Capacitaciones · INFRAESTRUCTURA · Composición (wiring).

import "server-only";

import { repositorioCapacitaciones } from "./capacitaciones.repository";
import {
  listarCapacitaciones,
  registrarVista,
  verCapacitacion,
} from "../application/consultar-capacitaciones";
import {
  agregarMaterial,
  agregarTema,
  archivarCapacitacion,
  crearCapacitacion,
  editarCapacitacion,
  editarTema,
  eliminarCapacitacion,
  eliminarMaterial,
  eliminarTema,
  publicarCapacitacion,
} from "../application/administrar-capacitaciones";
import type {
  DatosCapacitacion,
  DatosMaterial,
  DatosTema,
  FiltrosCapacitaciones,
} from "../application/ports";

const deps = { repo: repositorioCapacitaciones };

/* ── Consulta ── */

export function listarCapacitacionesWired(filtros: FiltrosCapacitaciones = {}) {
  return listarCapacitaciones(deps, filtros);
}

export function verCapacitacionWired(id: string) {
  return verCapacitacion(deps, id);
}

export function registrarVistaWired(id: string) {
  return registrarVista(deps, id);
}

/* ── Administración ── */

export function crearCapacitacionWired(datos: DatosCapacitacion, creadaPor: string) {
  return crearCapacitacion(deps, datos, creadaPor);
}

export function editarCapacitacionWired(id: string, datos: Partial<DatosCapacitacion>) {
  return editarCapacitacion(deps, id, datos);
}

export function publicarCapacitacionWired(id: string) {
  return publicarCapacitacion(deps, id);
}

export function archivarCapacitacionWired(id: string) {
  return archivarCapacitacion(deps, id);
}

export function eliminarCapacitacionWired(id: string) {
  return eliminarCapacitacion(deps, id);
}

export function agregarTemaWired(capId: string, datos: DatosTema) {
  return agregarTema(deps, capId, datos);
}

export function editarTemaWired(temaId: string, datos: Partial<DatosTema>) {
  return editarTema(deps, temaId, datos);
}

export function eliminarTemaWired(temaId: string) {
  return eliminarTema(deps, temaId);
}

export function agregarMaterialWired(temaId: string, datos: DatosMaterial) {
  return agregarMaterial(deps, temaId, datos);
}

export function eliminarMaterialWired(materialId: string) {
  return eliminarMaterial(deps, materialId);
}
