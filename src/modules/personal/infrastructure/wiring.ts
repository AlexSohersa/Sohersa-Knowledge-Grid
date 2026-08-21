// Módulo Personal · INFRAESTRUCTURA · Composición (wiring).
//
// Este módulo no tiene casos de uso propios: sus operaciones son de una sola
// línea y añadir una capa de aplicación que solo reenviara la llamada sería
// ceremonia sin beneficio. El wiring expone el repositorio directamente, que es
// la simplificación honesta cuando no hay reglas que orquestar.

import "server-only";

import { repositorioPersonal } from "./personal.repository";
import { agruparPorDia, contarPorTipo } from "../domain/guardado";
import type { KindId } from "@/modules/shared/domain/conocimiento";

/** Cuántas cosas tiene guardadas, para la insignia de la barra superior. */
export function contarGuardadosWired(email: string) {
  return repositorioPersonal.contarGuardados(email);
}

/** Los guardados, con el conteo por tipo para las pestañas. */
export async function listarGuardadosWired(email: string, kind?: KindId) {
  const [items, todos] = await Promise.all([
    repositorioPersonal.listarGuardados(email, kind),
    // El conteo por pestaña se calcula sobre TODOS, no sobre los filtrados: si
    // no, al elegir una pestaña las demás mostrarían cero.
    repositorioPersonal.listarGuardados(email),
  ]);
  return { items, porTipo: contarPorTipo(todos), total: todos.length };
}

export function estaGuardadoWired(email: string, kind: KindId, targetId: string) {
  return repositorioPersonal.estaGuardado(email, kind, targetId);
}

export function alternarGuardadoWired(
  email: string,
  kind: KindId,
  targetId: string,
  title: string,
) {
  return repositorioPersonal.alternarGuardado(email, kind, targetId, title);
}

/** El historial, ya agrupado por día. */
export async function listarHistorialWired(email: string, limite = 60) {
  const vistos = await repositorioPersonal.listarHistorial(email, limite);
  return { grupos: agruparPorDia(vistos), total: vistos.length };
}

export function registrarVisitaWired(
  email: string,
  kind: KindId,
  targetId: string,
  title: string,
) {
  return repositorioPersonal.registrarVisita(email, kind, targetId, title);
}

export function limpiarHistorialWired(email: string) {
  return repositorioPersonal.limpiarHistorial(email);
}
