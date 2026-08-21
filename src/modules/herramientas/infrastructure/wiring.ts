// Módulo Herramientas · INFRAESTRUCTURA · Composición (wiring).

import "server-only";

import { repositorioHerramientas } from "./herramientas.repository";
import { conocimientoPorHerramienta } from "./conocimiento.adapter";
import {
  crearHerramienta,
  darDeBajaHerramienta,
  editarHerramienta,
  listarHerramientas,
  verHerramienta,
} from "../application/listar-herramientas";
import type { DatosHerramienta, FiltrosHerramientas } from "../application/ports";

const deps = {
  repo: repositorioHerramientas,
  conocimiento: conocimientoPorHerramienta,
};

export function listarHerramientasWired(filtros: FiltrosHerramientas = {}) {
  return listarHerramientas(deps, filtros);
}

export function verHerramientaWired(id: string) {
  return verHerramienta(deps, id);
}

export function crearHerramientaWired(datos: DatosHerramienta) {
  return crearHerramienta(deps, datos);
}

export function editarHerramientaWired(id: string, datos: Partial<DatosHerramienta>) {
  return editarHerramienta(deps, id, datos);
}

export function darDeBajaHerramientaWired(id: string) {
  return darDeBajaHerramienta(deps, id);
}
