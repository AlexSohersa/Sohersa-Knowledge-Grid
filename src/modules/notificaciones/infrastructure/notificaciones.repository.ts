// Módulo NOTIFICACIONES · INFRAESTRUCTURA · Repositorio Prisma.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import {
  claveDe,
  type ClaseAviso,
  type Notificacion,
} from "../domain/notificacion";

/** Cuántos avisos guarda la campana. Más allá, nadie baja a mirarlos. */
const TOPE = 50;

/** Lo que hace falta para crear un aviso. */
export interface NuevoAviso {
  email: string;
  kind: ClaseAviso;
  title: string;
  body?: string | null;
  href?: string | null;
  /** Lo que identifica el HECHO: el id de la respuesta, de la propuesta… */
  ref: string;
}

export const repositorioNotificaciones = {
  /**
   * Crea un aviso, o no hace nada si ese hecho ya se avisó.
   *
   * Se apoya en el índice único `(email, dedupeKey)`: dos intentos del mismo
   * hecho chocan y el segundo se descarta en la base, no en código. Eso lo hace
   * seguro incluso si dos peticiones entran a la vez.
   */
  async crear(aviso: NuevoAviso): Promise<void> {
    if (!gridConfigured) return;

    await gridDb()
      .notificacion.create({
        data: {
          email: aviso.email.toLowerCase(),
          kind: aviso.kind,
          title: aviso.title,
          body: aviso.body ?? null,
          href: aviso.href ?? null,
          dedupeKey: claveDe(aviso.kind, aviso.ref),
        },
      })
      /*
       * Un aviso repetido no es un error: es la señal de que el hecho ya se
       * comunicó. Se traga aquí porque avisar es SIEMPRE secundario respecto a
       * la acción que lo provocó —responder una pregunta debe funcionar aunque
       * el aviso falle—.
       */
      .catch(() => undefined);
  },

  /** Lo mismo para varias personas a la vez: avisar a los administradores. */
  async crearVarios(correos: string[], aviso: Omit<NuevoAviso, "email">): Promise<void> {
    for (const email of new Set(correos.map((c) => c.toLowerCase()))) {
      await this.crear({ ...aviso, email });
    }
  },

  /** Los avisos de una persona, lo más reciente primero. */
  async listar(email: string): Promise<Notificacion[]> {
    if (!gridConfigured) return [];

    const filas = await gridDb().notificacion.findMany({
      where: { email: email.toLowerCase() },
      orderBy: { createdAt: "desc" },
      take: TOPE,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    });

    return filas.map((f) => ({ ...f, kind: f.kind as ClaseAviso }));
  },

  /** Cuántos sin leer. Es lo único que necesita el contador de la campana. */
  async sinLeer(email: string): Promise<number> {
    if (!gridConfigured) return 0;

    return gridDb().notificacion.count({
      where: { email: email.toLowerCase(), readAt: null },
    });
  },

  /** Marca como leídos todos los de una persona. */
  async marcarLeidos(email: string): Promise<void> {
    if (!gridConfigured) return;

    await gridDb().notificacion.updateMany({
      where: { email: email.toLowerCase(), readAt: null },
      data: { readAt: new Date() },
    });
  },

  /** Marca uno solo, al pulsarlo. */
  async marcarLeido(id: string, email: string): Promise<void> {
    if (!gridConfigured) return;

    await gridDb().notificacion.updateMany({
      // El correo va en el `where` para que nadie marque los avisos de otro
      // pasando un id ajeno.
      where: { id, email: email.toLowerCase(), readAt: null },
      data: { readAt: new Date() },
    });
  },
};
