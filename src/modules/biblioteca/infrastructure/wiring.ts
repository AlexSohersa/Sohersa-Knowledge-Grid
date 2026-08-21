// Módulo Biblioteca · INFRAESTRUCTURA · Composición (wiring).
//
// Punto único donde los casos de uso se conectan con sus implementaciones
// concretas. Las páginas y Server Actions importan estas funciones ya
// "cableadas", sin conocer los ports ni los repositorios. Es el borde entre la
// arquitectura limpia y el framework.

import "server-only";

import { repositorioBiblioteca, permisosBiblioteca } from "./biblioteca.repository";
import {
  listarAutomatizaciones,
  listarBiblioteca,
  verDocumento,
} from "../application/listar-biblioteca";
import type { FiltrosBiblioteca } from "../application/ports";

const deps = { repo: repositorioBiblioteca, permisos: permisosBiblioteca };

export function listarBibliotecaWired(email: string, filtros: FiltrosBiblioteca = {}) {
  return listarBiblioteca(deps, email, filtros);
}

export function verDocumentoWired(email: string, code: string) {
  return verDocumento(deps, email, code);
}

export function listarAutomatizacionesWired(categoria?: string) {
  return listarAutomatizaciones({ repo: repositorioBiblioteca }, categoria);
}

/** Para la búsqueda global, que necesita los documentos sin agrupar. */
export function buscarDocumentosWired(email: string, busqueda: string) {
  return listarBiblioteca(deps, email, { busqueda });
}
