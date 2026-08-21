// Módulo Rutas · INFRAESTRUCTURA · El avance de una ruta asignada.
//
// El avance vive aquí y no en Capacitaciones a propósito: una capacitación es
// material de consulta, y solo dentro de un camino asignado tiene sentido decir
// "esto ya lo hiciste".
//
// La fila cuelga de la ASIGNACIÓN, así que la misma capacitación en dos rutas
// lleva dos cuentas independientes.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";

/** El avance de un elemento concreto de la ruta. */
export interface AvanceItem {
  itemId: string;
  /** `null` para documentos, que se marcan completos de una pieza. */
  topicId: string | null;
  completed: boolean;
  downloaded: boolean;
  seconds: number;
}

export const repositorioAvance = {
  /**
   * Todo el avance de una asignación, de una sola consulta.
   *
   * Se trae completo porque la pantalla de la ruta lo necesita entero para
   * calcular el porcentaje y saber qué etapa está abierta; pedirlo por partes
   * multiplicaría las consultas sin ahorrar nada.
   */
  async deAsignacion(assignmentId: string): Promise<AvanceItem[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .pathProgress.findMany({
        where: { assignmentId },
        select: {
          itemId: true,
          topicId: true,
          completed: true,
          downloaded: true,
          seconds: true,
        },
      })
      .catch(() => []);
    return filas;
  },

  /**
   * Marca (o desmarca) un elemento como hecho.
   *
   * `topicId` distingue los dos casos: una capacitación lleva la cuenta tema a
   * tema, un documento se marca de una pieza. La clave única los cubre a los
   * dos porque el tema es opcional.
   */
  async marcar(
    assignmentId: string,
    itemId: string,
    topicId: string | null,
    completado: boolean,
  ): Promise<void> {
    const existente = await gridDb()
      .pathProgress.findFirst({
        where: { assignmentId, itemId, topicId },
        select: { id: true },
      })
      .catch(() => null);

    if (existente) {
      await gridDb().pathProgress.update({
        where: { id: existente.id },
        data: {
          completed: completado,
          completedAt: completado ? new Date() : null,
        },
      });
      return;
    }

    await gridDb().pathProgress.create({
      data: {
        assignmentId,
        itemId,
        topicId,
        completed: completado,
        completedAt: completado ? new Date() : null,
      },
    });
  },

  /**
   * Registra que se descargó el material de un elemento.
   *
   * Es una señal distinta de "lo vio": en una ruta con plantillas y checklists,
   * bajarse el archivo ES el paso que importa. Nunca se desmarca —descargar
   * algo es un hecho, no un estado que se pueda revertir—.
   */
  async marcarDescarga(
    assignmentId: string,
    itemId: string,
    topicId: string | null,
  ): Promise<void> {
    const existente = await gridDb()
      .pathProgress.findFirst({
        where: { assignmentId, itemId, topicId },
        select: { id: true },
      })
      .catch(() => null);

    if (existente) {
      await gridDb().pathProgress.update({
        where: { id: existente.id },
        data: { downloaded: true, downloadedAt: new Date() },
      });
      return;
    }

    await gridDb().pathProgress.create({
      data: { assignmentId, itemId, topicId, downloaded: true, downloadedAt: new Date() },
    });
  },

  /** Guarda el segundo del video donde se quedó, para reanudar. */
  async guardarPosicion(
    assignmentId: string,
    itemId: string,
    topicId: string | null,
    segundos: number,
  ): Promise<void> {
    const existente = await gridDb()
      .pathProgress.findFirst({
        where: { assignmentId, itemId, topicId },
        select: { id: true },
      })
      .catch(() => null);

    if (existente) {
      await gridDb().pathProgress.update({
        where: { id: existente.id },
        data: { seconds: segundos },
      });
      return;
    }

    await gridDb().pathProgress.create({
      data: { assignmentId, itemId, topicId, seconds: segundos },
    });
  },

  /** La asignación activa de una persona para una ruta, si la tiene. */
  async asignacionDe(email: string, pathId: string): Promise<string | null> {
    if (!gridConfigured) return null;
    const fila = await gridDb()
      .pathAssignment.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          pathId,
          active: true,
        },
        select: { id: true },
      })
      .catch(() => null);
    return fila?.id ?? null;
  },
};
