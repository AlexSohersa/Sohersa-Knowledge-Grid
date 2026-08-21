// Módulo Comunidad · INFRAESTRUCTURA · Composición (wiring).
//
// Aquí se junta el repositorio propio con el adaptador del módulo de FAQ: es el
// único punto donde los dos módulos se tocan, y lo hacen a través del contrato
// que declaró Comunidad.

import "server-only";

import { repositorioComunidad } from "./comunidad.repository";
import { promoverAFaq as adaptadorFaq } from "@/modules/faq/infrastructure/promover-desde-comunidad";
import {
  alternarVoto,
  comentar,
  editarRespuesta,
  eliminarPregunta,
  eliminarRespuesta,
  listarPreguntas,
  preguntar,
  promoverAFaq,
  responder,
  validarComoSolucion,
  verPregunta,
} from "../application/gestionar-comunidad";
import type { Autor, DatosPregunta, FiltrosComunidad } from "../application/ports";

const deps = { repo: repositorioComunidad, faq: adaptadorFaq };

/* ── Consulta ── */

export function listarPreguntasWired(email: string, filtros: FiltrosComunidad = {}) {
  return listarPreguntas(deps, email, filtros);
}

export function verPreguntaWired(email: string, id: string) {
  return verPregunta(deps, email, id);
}

export function registrarVistaPreguntaWired(id: string) {
  return repositorioComunidad.registrarVista(id);
}

/* ── Escritura ── */

export function preguntarWired(datos: DatosPregunta, autor: Autor) {
  return preguntar(deps, datos, autor);
}

export function responderWired(preguntaId: string, body: string, autor: Autor) {
  return responder(deps, preguntaId, body, autor);
}

export function validarComoSolucionWired(
  respuestaId: string,
  email: string,
  esAdmin: boolean,
  validar: boolean,
) {
  return validarComoSolucion(deps, respuestaId, email, esAdmin, validar);
}

export function alternarVotoWired(respuestaId: string, email: string) {
  return alternarVoto(deps, respuestaId, email);
}

export function comentarWired(respuestaId: string, body: string, autor: Autor) {
  return comentar(deps, respuestaId, body, autor);
}

export function editarRespuestaWired(
  respuestaId: string,
  body: string,
  email: string,
  esAdmin: boolean,
) {
  return editarRespuesta(deps, respuestaId, body, email, esAdmin);
}

export function eliminarRespuestaWired(respuestaId: string, email: string, esAdmin: boolean) {
  return eliminarRespuesta(deps, respuestaId, email, esAdmin);
}

export function eliminarPreguntaWired(email: string, id: string, esAdmin: boolean) {
  return eliminarPregunta(deps, email, id, esAdmin);
}

export function promoverAFaqWired(email: string, preguntaId: string, esAdmin: boolean) {
  return promoverAFaq(deps, email, preguntaId, esAdmin);
}

/** La pregunta a la que pertenece una respuesta, para revalidar su ruta. */
export function preguntaDeRespuestaWired(respuestaId: string) {
  return repositorioComunidad.preguntaDeRespuesta(respuestaId);
}
