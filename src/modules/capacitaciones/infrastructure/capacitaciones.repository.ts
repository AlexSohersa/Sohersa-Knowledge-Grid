// Módulo Capacitaciones · INFRAESTRUCTURA · Repositorio Prisma.
//
// La única capa que conoce la base. Escribe sobre la base PROPIA de Knowledge
// Grid: las capacitaciones nacen aquí y en ningún otro sitio.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import { normalizar } from "@/modules/biblioteca/domain/documento";
import type { Capacitacion, Tema } from "../domain/capacitacion";
import type {
  DatosCapacitacion,
  DatosMaterial,
  DatosTema,
  FiltrosCapacitaciones,
  RepositorioCapacitaciones,
} from "../application/ports";

/**
 * Cómo se consulta una capacitación con todo lo que cuelga de ella.
 *
 * Sin avance: la capacitación es material de consulta y se ve igual para todo
 * el equipo. El avance vive en la ruta (`PathProgress`).
 */
const INCLUIR_TODO = {
  topics: {
    orderBy: { position: "asc" as const },
    include: { materials: { orderBy: { position: "asc" as const } } },
  },
};

/* El tipo que devuelve Prisma con ese include, sin escribirlo a mano. */
type FilaConTodo = {
  id: string;
  title: string;
  summary: string | null;
  objectives: string[];
  instructor: string | null;
  instructorRole: string | null;
  duration: string | null;
  durationMin: number;
  level: string;
  category: string | null;
  software: string | null;
  accent: string;
  status: string;
  period: string | null;
  views: number;
  topics: Array<{
    id: string;
    code: string;
    title: string;
    summary: string | null;
    kind: string;
    duration: string | null;
    videoUrl: string | null;
    materials: Array<{
      id: string;
      title: string;
      kind: string;
      url: string | null;
      driveId: string | null;
      sizeText: string | null;
      downloadable: boolean;
    }>;
  }>;
};

function aCapacitacion(fila: FilaConTodo): Capacitacion {
  const temas: Tema[] = fila.topics.map((t) => {
    return {
      id: t.id,
      code: t.code,
      title: t.title,
      summary: t.summary,
      kind: t.kind,
      duration: t.duration,
      videoUrl: t.videoUrl,
      materials: t.materials.map((m) => ({
        id: m.id,
        title: m.title,
        kind: m.kind,
        url: m.url,
        driveId: m.driveId,
        sizeText: m.sizeText,
        downloadable: m.downloadable,
      })),
    };
  });

  return {
    id: fila.id,
    title: fila.title,
    summary: fila.summary,
    objectives: fila.objectives,
    instructor: fila.instructor,
    instructorRole: fila.instructorRole,
    duration: fila.duration,
    durationMin: fila.durationMin,
    level: fila.level,
    category: fila.category,
    software: fila.software,
    accent: fila.accent,
    status: fila.status,
    period: fila.period,
    views: fila.views,
    temas,
  };
}

export const repositorioCapacitaciones: RepositorioCapacitaciones = {
  async listar(filtros: FiltrosCapacitaciones): Promise<Capacitacion[]> {
    if (!gridConfigured) return [];

    const filas = await gridDb()
      .training.findMany({
        where: {
          ...(filtros.categoria && filtros.categoria !== "Todas"
            ? { category: filtros.categoria }
            : {}),
          ...(filtros.nivel && filtros.nivel !== "Todos" ? { level: filtros.nivel } : {}),
          ...(filtros.software && filtros.software !== "Todos"
            ? { software: filtros.software }
            : {}),
        },
        include: INCLUIR_TODO,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => [] as FilaConTodo[]);

    let caps = filas.map(aCapacitacion);

    // El texto se filtra en memoria por la misma razón que en la biblioteca: la
    // comparación sin acentos exige `unaccent`, que no está garantizada.
    if (filtros.busqueda?.trim()) {
      const q = normalizar(filtros.busqueda);
      const palabras = q.split(/\s+/).filter(Boolean);
      caps = caps.filter((c) => {
        const heno = normalizar(
          [c.title, c.summary, c.instructor, c.category, c.software, ...c.objectives]
            .filter(Boolean)
            .join(" "),
        );
        return palabras.every((p) => heno.includes(p));
      });
    }

    return caps;
  },

  async porId(id: string): Promise<Capacitacion | null> {
    if (!gridConfigured) return null;
    const fila = await gridDb()
      .training.findUnique({ where: { id }, include: INCLUIR_TODO })
      .catch(() => null);
    return fila ? aCapacitacion(fila as FilaConTodo) : null;
  },

  async registrarVista(id: string): Promise<void> {
    if (!gridConfigured) return;
    /*
     * Es la única escritura que puede fallar en silencio: el contador de vistas
     * es una métrica, y perder una es preferible a romper la carga de la ficha
     * que la persona vino a leer.
     */
    await gridDb()
      .training.update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => null);
  },

  async crear(datos: DatosCapacitacion, creadaPor: string): Promise<string> {
    const fila = await gridDb().training.create({
      data: {
        title: datos.title,
        summary: datos.summary ?? null,
        objectives: datos.objectives ?? [],
        instructor: datos.instructor ?? null,
        instructorRole: datos.instructorRole ?? null,
        duration: datos.duration ?? null,
        durationMin: datos.durationMin ?? 0,
        level: datos.level ?? "Básico",
        category: datos.category ?? null,
        software: datos.software ?? null,
        accent: datos.accent ?? "#32D66B",
        status: datos.status ?? "BORRADOR",
        period: datos.period ?? null,
        createdBy: creadaPor,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editar(id: string, datos: Partial<DatosCapacitacion>): Promise<void> {
    await gridDb().training.update({ where: { id }, data: datos });
  },

  async eliminar(id: string): Promise<void> {
    // Los temas, materiales y avances caen solos por `onDelete: Cascade`.
    await gridDb().training.delete({ where: { id } });
  },

  async agregarTema(capId: string, datos: DatosTema): Promise<string> {
    // La posición por omisión es la siguiente: quien agrega un tema casi
    // siempre lo quiere al final, y pedirla en cada llamada sería ruido.
    const ultimo = await gridDb()
      .trainingTopic.findFirst({
        where: { trainingId: capId },
        orderBy: { position: "desc" },
        select: { position: true },
      })
      .catch(() => null);

    const fila = await gridDb().trainingTopic.create({
      data: {
        trainingId: capId,
        code: datos.code,
        title: datos.title,
        summary: datos.summary ?? null,
        kind: datos.kind ?? "Video",
        duration: datos.duration ?? null,
        videoUrl: datos.videoUrl ?? null,
        position: datos.position ?? (ultimo?.position ?? -1) + 1,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editarTema(temaId: string, datos: Partial<DatosTema>): Promise<void> {
    await gridDb().trainingTopic.update({ where: { id: temaId }, data: datos });
  },

  async eliminarTema(temaId: string): Promise<void> {
    await gridDb().trainingTopic.delete({ where: { id: temaId } });
  },

  async agregarMaterial(temaId: string, datos: DatosMaterial): Promise<string> {
    const ultimo = await gridDb()
      .trainingMaterial.findFirst({
        where: { topicId: temaId },
        orderBy: { position: "desc" },
        select: { position: true },
      })
      .catch(() => null);

    const fila = await gridDb().trainingMaterial.create({
      data: {
        topicId: temaId,
        title: datos.title,
        kind: datos.kind ?? "PDF",
        url: datos.url ?? null,
        driveId: datos.driveId ?? null,
        sizeText: datos.sizeText ?? null,
        downloadable: datos.downloadable ?? true,
        position: datos.position ?? (ultimo?.position ?? -1) + 1,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async eliminarMaterial(materialId: string): Promise<void> {
    await gridDb().trainingMaterial.delete({ where: { id: materialId } });
  },
};
