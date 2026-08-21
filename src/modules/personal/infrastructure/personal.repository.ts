// Módulo Personal · INFRAESTRUCTURA · Repositorio Prisma.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import type { KindId } from "@/modules/shared/domain/conocimiento";
import type { Guardado, Visto } from "../domain/guardado";
import type { RepositorioPersonal } from "../application/ports";

export const repositorioPersonal: RepositorioPersonal = {
  async listarGuardados(email: string, kind?: KindId): Promise<Guardado[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .bookmark.findMany({
        where: { email: { equals: email, mode: "insensitive" }, ...(kind ? { kind } : {}) },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []);
    return filas.map((f) => ({
      id: f.id,
      kind: f.kind as KindId,
      targetId: f.targetId,
      title: f.title,
      createdAt: f.createdAt,
    }));
  },

  async contarGuardados(email: string): Promise<number> {
    if (!gridConfigured) return 0;
    return gridDb()
      .bookmark.count({ where: { email: { equals: email, mode: "insensitive" } } })
      .catch(() => 0);
  },

  async estaGuardado(email: string, kind: KindId, targetId: string): Promise<boolean> {
    if (!gridConfigured) return false;
    const f = await gridDb()
      .bookmark.findUnique({
        where: { email_kind_targetId: { email, kind, targetId } },
        select: { id: true },
      })
      .catch(() => null);
    return Boolean(f);
  },

  async alternarGuardado(
    email: string,
    kind: KindId,
    targetId: string,
    title: string,
  ): Promise<boolean> {
    const existente = await gridDb()
      .bookmark.findUnique({
        where: { email_kind_targetId: { email, kind, targetId } },
        select: { id: true },
      })
      .catch(() => null);

    if (existente) {
      await gridDb().bookmark.delete({ where: { id: existente.id } });
      return false;
    }

    await gridDb().bookmark.create({ data: { email, kind, targetId, title } });
    return true;
  },

  async listarHistorial(email: string, limite: number): Promise<Visto[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .viewLog.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        orderBy: { viewedAt: "desc" },
        take: limite,
      })
      .catch(() => []);
    return filas.map((f) => ({
      id: f.id,
      kind: f.kind as KindId,
      targetId: f.targetId,
      title: f.title,
      viewedAt: f.viewedAt,
    }));
  },

  async registrarVisita(
    email: string,
    kind: KindId,
    targetId: string,
    title: string,
  ): Promise<void> {
    if (!gridConfigured) return;
    /*
     * Upsert y no create: el historial responde "¿dónde estaba?", no "¿cuántas
     * veces entré?". Una fila por apertura haría crecer la tabla sin fin y
     * llenaría la pantalla con el mismo documento repetido.
     *
     * Falla en silencio a propósito: es un registro secundario, y perder una
     * entrada no debe impedir que se abra el documento que la persona vino a
     * leer.
     */
    await gridDb()
      .viewLog.upsert({
        where: { email_kind_targetId: { email, kind, targetId } },
        create: { email, kind, targetId, title },
        update: { title, viewedAt: new Date() },
      })
      .catch(() => null);
  },

  async limpiarHistorial(email: string): Promise<void> {
    await gridDb().viewLog.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    });
  },
};
