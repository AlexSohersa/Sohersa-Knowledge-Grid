// Módulo FAQ · INFRAESTRUCTURA · Composición (wiring).

import "server-only";

import { repositorioFaq } from "./faq.repository";
import { gridDb } from "@/lib/grid/db";
import { prefijoDe, siguienteCodigo } from "../domain/faq";
import { repositorioComentarios, repositorioPropuestas } from "./propuestas.repository";
import {
  crearFaq,
  editarFaq,
  eliminarFaq,
  listarFaq,
  verFaq,
  votarFaq,
} from "../application/gestionar-faq";
import type {
  DatosFaq,
  DatosPropuesta,
  FiltrosFaq,
  Propuesta,
} from "../application/ports";

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


/* ── Propuestas ─────────────────────────────────────────────────────────── */

export function proponerFaqWired(
  datos: DatosPropuesta,
  autor: { email: string; nombre: string; area: string | null },
) {
  return repositorioPropuestas.crear(datos, autor);
}

export function listarPropuestasWired(estado?: Propuesta["status"]) {
  return repositorioPropuestas.listar(estado);
}

export function verPropuestaWired(id: string) {
  return repositorioPropuestas.porId(id);
}

export function propuestasPendientesWired() {
  return repositorioPropuestas.pendientes();
}

export function resolverPropuestaWired(
  id: string,
  resolucion: {
    status: "APROBADA" | "RECHAZADA";
    reviewedBy: string;
    reviewNote?: string | null;
    faqId?: string | null;
  },
) {
  return repositorioPropuestas.resolver(id, resolucion);
}

/* ── Comentarios al área ────────────────────────────────────────────────── */

export function comentarWired(
  datos: { message: string; faqId?: string | null },
  autor: { email: string; nombre: string; area: string | null },
) {
  return repositorioComentarios.crear(datos, autor);
}

export function listarComentariosWired(soloPendientes = false) {
  return repositorioComentarios.listar(soloPendientes);
}

export function comentariosPendientesWired() {
  return repositorioComentarios.pendientes();
}

export function resolverComentarioWired(id: string, resueltoPor: string) {
  return repositorioComentarios.resolver(id, resueltoPor);
}

/** Un comentario suelto, para poder avisar a quien lo escribió al resolverlo. */
export async function verComentarioWired(id: string) {
  const todos = await repositorioComentarios.listar();
  return todos.find((c) => c.id === id) ?? null;
}

export function aceptarComentarioWired(id: string, aceptadoPor: string) {
  return repositorioComentarios.aceptar(id, aceptadoPor);
}

export function rechazarComentarioWired(id: string, rechazadoPor: string, motivo: string) {
  return repositorioComentarios.rechazar(id, rechazadoPor, motivo);
}

/** Los comentarios aceptados de una ficha. Se pintan debajo de ella. */
export function comentariosDeFichaWired(faqId: string) {
  return repositorioComentarios.aceptadosDe(faqId);
}

/**
 * El siguiente código libre para un software.
 *
 * Consulta los códigos que ya existen y devuelve el que sigue en su serie. Se
 * pregunta a la base y no se lleva un contador aparte: un contador se
 * desincroniza en cuanto alguien inserta una ficha a mano, y el código es la
 * referencia con la que el equipo se habla.
 */
export async function generarCodigoWired(plataforma: string | null): Promise<string> {
  const prefijo = prefijoDe(plataforma);

  const filas = await gridDb()
    .faqEntry.findMany({
      where: { code: { startsWith: `${prefijo}-` } },
      select: { code: true },
    })
    .catch(() => [] as Array<{ code: string | null }>);

  return siguienteCodigo(prefijo, filas.map((f) => f.code).filter(Boolean) as string[]);
}
