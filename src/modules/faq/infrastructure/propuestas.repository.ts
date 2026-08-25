// Módulo FAQ · INFRAESTRUCTURA · Propuestas y comentarios.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import type {
  Comentario,
  DatosPropuesta,
  Propuesta,
  RepositorioComentarios,
  RepositorioPropuestas,
} from "../application/ports";

/** El autor, tal como se guarda: correo más nombre y área del momento. */
type Autor = { email: string; nombre: string; area: string | null };

export const repositorioPropuestas: RepositorioPropuestas = {
  async crear(datos: DatosPropuesta, autor: Autor): Promise<string> {
    const fila = await gridDb().faqPropuesta.create({
      data: {
        title: datos.title.trim(),
        description: datos.description.trim(),
        platform: datos.platform ?? null,
        solution: datos.solution?.trim() || null,
        imageDriveId: datos.imageDriveId ?? null,
        imageName: datos.imageName ?? null,
        // `persona_id` NO se escribe: la rellena el disparador desde el correo.
        email: autor.email.toLowerCase(),
        authorName: autor.nombre,
        authorArea: autor.area,
      },
      select: { id: true },
    });

    return fila.id;
  },

  async listar(estado): Promise<Propuesta[]> {
    if (!gridConfigured) return [];

    const filas = await gridDb().faqPropuesta.findMany({
      where: estado ? { status: estado } : undefined,
      // Lo pendiente arriba y lo más antiguo primero: quien lleva más tiempo
      // esperando una respuesta es a quien peor le sienta la espera.
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    return filas.map((f) => ({ ...f, status: f.status as Propuesta["status"] }));
  },

  async porId(id: string): Promise<Propuesta | null> {
    if (!gridConfigured) return null;

    const f = await gridDb().faqPropuesta.findUnique({ where: { id } });
    return f ? { ...f, status: f.status as Propuesta["status"] } : null;
  },

  async pendientes(): Promise<number> {
    if (!gridConfigured) return 0;
    return gridDb().faqPropuesta.count({ where: { status: "PENDIENTE" } });
  },

  async resolver(id, resolucion): Promise<void> {
    await gridDb().faqPropuesta.update({
      where: { id },
      data: {
        status: resolucion.status,
        reviewedBy: resolucion.reviewedBy,
        reviewNote: resolucion.reviewNote ?? null,
        faqId: resolucion.faqId ?? null,
        reviewedAt: new Date(),
      },
    });
  },
};

export const repositorioComentarios: RepositorioComentarios = {
  async crear(datos, autor: Autor): Promise<string> {
    const fila = await gridDb().faqComentario.create({
      data: {
        message: datos.message.trim(),
        faqId: datos.faqId ?? null,
        email: autor.email.toLowerCase(),
        authorName: autor.nombre,
        authorArea: autor.area,
      },
      select: { id: true },
    });

    return fila.id;
  },

  async listar(soloPendientes = false): Promise<Comentario[]> {
    if (!gridConfigured) return [];

    return gridDb().faqComentario.findMany({
      where: soloPendientes ? { resolved: false } : undefined,
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    });
  },

  async pendientes(): Promise<number> {
    if (!gridConfigured) return 0;
    return gridDb().faqComentario.count({ where: { resolved: false } });
  },

  async resolver(id: string, resueltoPor: string): Promise<void> {
    await gridDb().faqComentario.update({
      where: { id },
      data: { resolved: true, resolvedBy: resueltoPor, resolvedAt: new Date() },
    });
  },

  async aceptar(id: string, aceptadoPor: string): Promise<void> {
    await gridDb().faqComentario.update({
      where: { id },
      data: {
        status: "ACEPTADO",
        resolved: true,
        resolvedBy: aceptadoPor,
        resolvedAt: new Date(),
      },
    });
  },

  async rechazar(id: string, rechazadoPor: string, motivo: string): Promise<void> {
    await gridDb().faqComentario.update({
      where: { id },
      data: {
        status: "RECHAZADO",
        reviewNote: motivo,
        resolved: true,
        resolvedBy: rechazadoPor,
        resolvedAt: new Date(),
      },
    });
  },

  /**
   * Los comentarios ACEPTADOS de una ficha, para pintarlos debajo de ella.
   *
   * Solo los aceptados: un comentario pendiente todavía no lo ha visto nadie del
   * área, y uno rechazado se decidió que no formara parte de la ficha.
   */
  async aceptadosDe(faqId: string): Promise<Comentario[]> {
    if (!gridConfigured) return [];

    return gridDb().faqComentario.findMany({
      where: { faqId, status: "ACEPTADO" },
      orderBy: { createdAt: "desc" },
    });
  },
};
