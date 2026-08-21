// Módulo Rutas · INFRAESTRUCTURA · Repositorio Prisma.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import type { Ruta } from "../domain/ruta";
import type {
  AsignacionConAvance,
  DatosEtapa,
  DatosItemRuta,
  DatosRuta,
  RepositorioRutas,
} from "../application/ports";

/**
 * La ruta con sus etapas, sus elementos y —cuando el elemento es una
 * capacitación— sus temas con material.
 *
 * Los temas se traen aquí porque la ruta lleva la cuenta tema a tema: sin
 * ellos habría que consultar cada capacitación por separado para saber si un
 * elemento está terminado.
 */
const INCLUIR_ESTRUCTURA = {
  stages: {
    orderBy: { position: "asc" as const },
    include: {
      items: {
        orderBy: { position: "asc" as const },
        include: {
          training: {
            include: {
              topics: {
                orderBy: { position: "asc" as const },
                include: { materials: { orderBy: { position: "asc" as const } } },
              },
            },
          },
        },
      },
    },
  },
};

type FilaMaterial = {
  id: string;
  title: string;
  kind: string;
  url: string | null;
  driveId: string | null;
  downloadable: boolean;
};

type FilaTema = {
  id: string;
  code: string;
  title: string;
  kind: string;
  duration: string | null;
  videoUrl: string | null;
  materials: FilaMaterial[];
};

type FilaItem = {
  id: string;
  trainingId: string | null;
  resourceCode: string | null;
  title: string;
  duration: string | null;
  position: number;
  training: { topics: FilaTema[] } | null;
};

type FilaEtapa = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  position: number;
  items: FilaItem[];
};

type FilaRuta = {
  id: string;
  name: string;
  objective: string | null;
  stages: FilaEtapa[];
};

function aRuta(f: FilaRuta): Ruta {
  return {
    id: f.id,
    name: f.name,
    objective: f.objective,
    etapas: f.stages.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      description: e.description,
      position: e.position,
      items: e.items.map((i) => ({
        id: i.id,
        trainingId: i.trainingId,
        resourceCode: i.resourceCode,
        title: i.title,
        duration: i.duration,
        position: i.position,
        temas: (i.training?.topics ?? []).map((t) => ({
          id: t.id,
          code: t.code,
          title: t.title,
          kind: t.kind,
          duration: t.duration,
          videoUrl: t.videoUrl,
          materiales: t.materials.map((m) => ({
            id: m.id,
            title: m.title,
            kind: m.kind,
            url: m.url,
            driveId: m.driveId,
            downloadable: m.downloadable,
          })),
          // El avance lo rellena la aplicación cruzando con `PathProgress`.
          completado: false,
          descargado: false,
          segundos: 0,
        })),
        completado: false,
        descargado: false,
      })),
    })),
  };
}

export const repositorioRutas: RepositorioRutas = {
  async misRutas(email: string): Promise<AsignacionConAvance[]> {
    if (!gridConfigured) return [];

    /*
     * Las rutas y su avance salen de UNA consulta.
     *
     * El avance cuelga de la asignación, así que `include` lo trae junto con la
     * estructura: pedirlo aparte obligaría a una segunda consulta por ruta y a
     * cruzarlo a mano.
     */
    const asignaciones = await gridDb()
      .pathAssignment.findMany({
        where: { email: { equals: email, mode: "insensitive" }, active: true },
        include: {
          path: { include: INCLUIR_ESTRUCTURA },
          progress: {
            select: {
              itemId: true,
              topicId: true,
              completed: true,
              downloaded: true,
              seconds: true,
            },
          },
        },
        orderBy: { startedAt: "asc" },
      })
      .catch(() => []);

    return asignaciones.map((a) => ({
      assignmentId: a.id,
      asignada: {
        ruta: aRuta(a.path as FilaRuta),
        assignedBy: a.assignedBy,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
      },
      avance: a.progress,
    }));
  },

  async listar(): Promise<Ruta[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .learningPath.findMany({
        where: { active: true },
        include: INCLUIR_ESTRUCTURA,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => [] as FilaRuta[]);
    return filas.map(aRuta);
  },

  async porId(id: string): Promise<Ruta | null> {
    if (!gridConfigured) return null;
    const f = await gridDb()
      .learningPath.findUnique({ where: { id }, include: INCLUIR_ESTRUCTURA })
      .catch(() => null);
    return f ? aRuta(f as FilaRuta) : null;
  },

  async crear(datos: DatosRuta, creadaPor: string): Promise<string> {
    const fila = await gridDb().learningPath.create({
      data: {
        name: datos.name,
        objective: datos.objective ?? null,
        active: datos.active ?? true,
        createdBy: creadaPor,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editar(id: string, datos: Partial<DatosRuta>): Promise<void> {
    await gridDb().learningPath.update({ where: { id }, data: datos });
  },

  async eliminar(id: string): Promise<void> {
    // Etapas, items y asignaciones caen por `onDelete: Cascade`.
    await gridDb().learningPath.delete({ where: { id } });
  },

  async agregarEtapa(rutaId: string, datos: DatosEtapa): Promise<string> {
    const ultima = await gridDb()
      .pathStage.findFirst({
        where: { pathId: rutaId },
        orderBy: { position: "desc" },
        select: { position: true },
      })
      .catch(() => null);

    const fila = await gridDb().pathStage.create({
      data: {
        pathId: rutaId,
        code: datos.code,
        name: datos.name,
        description: datos.description ?? null,
        position: datos.position ?? (ultima?.position ?? -1) + 1,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editarEtapa(etapaId: string, datos: Partial<DatosEtapa>): Promise<void> {
    await gridDb().pathStage.update({ where: { id: etapaId }, data: datos });
  },

  async eliminarEtapa(etapaId: string): Promise<void> {
    await gridDb().pathStage.delete({ where: { id: etapaId } });
  },

  async agregarItem(etapaId: string, datos: DatosItemRuta): Promise<string> {
    const ultimo = await gridDb()
      .pathItem.findFirst({
        where: { stageId: etapaId },
        orderBy: { position: "desc" },
        select: { position: true },
      })
      .catch(() => null);

    const fila = await gridDb().pathItem.create({
      data: {
        stageId: etapaId,
        trainingId: datos.trainingId ?? null,
        resourceCode: datos.resourceCode ?? null,
        title: datos.title,
        duration: datos.duration ?? null,
        position: datos.position ?? (ultimo?.position ?? -1) + 1,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async eliminarItem(itemId: string): Promise<void> {
    await gridDb().pathItem.delete({ where: { id: itemId } });
  },

  async asignar(rutaId: string, email: string, asignadaPor: string): Promise<void> {
    /*
     * Upsert y no create: asignar la misma ruta dos veces debe dejar el mismo
     * estado, no fallar. El mismo administrador puede volver a la pantalla y
     * pulsar de nuevo sin querer.
     *
     * Al reasignar se reactiva y se limpia la fecha de término: si alguien
     * vuelve a recorrer la ruta, no debe aparecer como terminada de antes.
     */
    await gridDb().pathAssignment.upsert({
      where: { email_pathId: { email, pathId: rutaId } },
      create: { email, pathId: rutaId, assignedBy: asignadaPor },
      update: { active: true, finishedAt: null, assignedBy: asignadaPor },
    });
  },

  async desasignar(rutaId: string, email: string): Promise<void> {
    /*
     * Se desactiva en vez de borrar: el histórico permite decir "ya hiciste
     * esta ruta", y borrar la fila perdería también el avance que motivó la
     * asignación.
     *
     * `updateMany` y no `update`: si la asignación ya no existe, `update`
     * lanzaría y habría que decidir si es un error o no. Con `updateMany`,
     * quitar algo que ya no está simplemente no afecta a ninguna fila —que es
     * el resultado que se buscaba— y cualquier OTRO fallo sí se propaga, en vez
     * de quedar oculto tras un `catch` que diría "listo" sin haber hecho nada.
     */
    await gridDb().pathAssignment.updateMany({
      where: { pathId: rutaId, email: { equals: email, mode: "insensitive" } },
      data: { active: false, finishedAt: new Date() },
    });
  },

  async asignados(rutaId: string): Promise<string[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .pathAssignment.findMany({
        where: { pathId: rutaId, active: true },
        select: { email: true },
        orderBy: { startedAt: "asc" },
      })
      .catch(() => []);
    return filas.map((f) => f.email);
  },
};
