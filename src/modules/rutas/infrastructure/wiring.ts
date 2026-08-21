// Módulo Rutas · INFRAESTRUCTURA · Composición (wiring).
//
// Aquí se juntan las dos mitades del módulo: el repositorio de estructura —el
// catálogo de rutas, cosa de administración— y el de avance, que registra lo
// que hace cada persona al recorrerlas.

import "server-only";

import { repositorioRutas } from "./rutas.repository";
import { repositorioAvance } from "./avance.repository";
import {
  agregarEtapa,
  agregarItem,
  asignadosDeRuta,
  asignarRuta,
  crearRuta,
  desasignarRuta,
  editarEtapa,
  editarRuta,
  eliminarEtapa,
  eliminarItem,
  eliminarRuta,
  guardarPosicion,
  listarRutas,
  marcarAvance,
  miRuta,
  misRutas,
  registrarDescarga,
  verRuta,
} from "../application/consultar-ruta";
import type { DatosEtapa, DatosItemRuta, DatosRuta } from "../application/ports";

const deps = { repo: repositorioRutas, avance: repositorioAvance };

/* ── Consulta ── */

export function misRutasWired(email: string) {
  return misRutas(deps, email);
}

export function miRutaWired(email: string, pathId?: string) {
  return miRuta(deps, email, pathId);
}

export function listarRutasWired() {
  return listarRutas(deps);
}

export function verRutaWired(id: string) {
  return verRuta(deps, id);
}

/* ── Avance ── */

export function marcarAvanceWired(
  email: string,
  pathId: string,
  itemId: string,
  topicId: string | null,
  completado: boolean,
) {
  return marcarAvance(deps, email, pathId, itemId, topicId, completado);
}

export function registrarDescargaWired(
  email: string,
  pathId: string,
  itemId: string,
  topicId: string | null,
) {
  return registrarDescarga(deps, email, pathId, itemId, topicId);
}

export function guardarPosicionWired(
  email: string,
  pathId: string,
  itemId: string,
  topicId: string | null,
  segundos: number,
) {
  return guardarPosicion(deps, email, pathId, itemId, topicId, segundos);
}

/* ── Administración ── */

export function crearRutaWired(datos: DatosRuta, creadaPor: string) {
  return crearRuta(deps, datos, creadaPor);
}

export function editarRutaWired(id: string, datos: Partial<DatosRuta>) {
  return editarRuta(deps, id, datos);
}

export function eliminarRutaWired(id: string) {
  return eliminarRuta(deps, id);
}

export function agregarEtapaWired(rutaId: string, datos: DatosEtapa) {
  return agregarEtapa(deps, rutaId, datos);
}

export function editarEtapaWired(etapaId: string, datos: Partial<DatosEtapa>) {
  return editarEtapa(deps, etapaId, datos);
}

export function eliminarEtapaWired(etapaId: string) {
  return eliminarEtapa(deps, etapaId);
}

export function agregarItemWired(etapaId: string, datos: DatosItemRuta) {
  return agregarItem(deps, etapaId, datos);
}

export function eliminarItemWired(itemId: string) {
  return eliminarItem(deps, itemId);
}

export function asignarRutaWired(rutaId: string, email: string, asignadaPor: string) {
  return asignarRuta(deps, rutaId, email, asignadaPor);
}

export function desasignarRutaWired(rutaId: string, email: string) {
  return desasignarRuta(deps, rutaId, email);
}

export function asignadosDeRutaWired(rutaId: string) {
  return asignadosDeRuta(deps, rutaId);
}
