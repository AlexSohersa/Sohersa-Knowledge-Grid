// Módulo FAQ · INFRAESTRUCTURA · Composición (wiring).

import "server-only";

import { repositorioFaq } from "./faq.repository";
import {
  crearFaq,
  editarFaq,
  eliminarFaq,
  listarFaq,
  verFaq,
  votarFaq,
} from "../application/gestionar-faq";
import type { DatosFaq, FiltrosFaq } from "../application/ports";

const deps = { repo: repositorioFaq };

export function listarFaqWired(email: string, filtros: FiltrosFaq = {}) {
  return listarFaq(deps, email, filtros);
}

export function verFaqWired(email: string, id: string) {
  return verFaq(deps, email, id);
}

export function crearFaqWired(datos: DatosFaq, creadaPor: string) {
  return crearFaq(deps, datos, creadaPor);
}

export function editarFaqWired(id: string, datos: Partial<DatosFaq>) {
  return editarFaq(deps, id, datos);
}

export function eliminarFaqWired(id: string) {
  return eliminarFaq(deps, id);
}

export function votarFaqWired(id: string, email: string, util: boolean) {
  return votarFaq(deps, id, email, util);
}
