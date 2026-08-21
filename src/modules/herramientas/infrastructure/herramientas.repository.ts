// Módulo Herramientas · INFRAESTRUCTURA · Repositorio Prisma.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import {
  ESTADOS_ADOPCION,
  type EstadoAdopcion,
  type Herramienta,
} from "../domain/herramienta";
import type {
  DatosHerramienta,
  FiltrosHerramientas,
  RepositorioHerramientas,
} from "../application/ports";

type Fila = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  version: string | null;
  license: string | null;
  discipline: string | null;
  accent: string;
  status: string;
  position: number;
  active: boolean;
};

function aHerramienta(f: Fila): Herramienta {
  return {
    id: f.id,
    name: f.name,
    kind: f.kind,
    description: f.description,
    version: f.version,
    license: f.license,
    discipline: f.discipline,
    accent: f.accent,
    /*
     * La base guarda texto libre; el dominio trabaja con un conjunto cerrado.
     * Un valor que no reconozcamos se trata como disponible, que es el caso
     * normal y el que menos sorprende a quien mira la lista.
     */
    status: (ESTADOS_ADOPCION as string[]).includes(f.status)
      ? (f.status as EstadoAdopcion)
      : "DISPONIBLE",
    position: f.position,
    active: f.active,
  };
}

export const repositorioHerramientas: RepositorioHerramientas = {
  async listar(filtros: FiltrosHerramientas): Promise<Herramienta[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .tool.findMany({
        where: {
          ...(filtros.incluirInactivas ? {} : { active: true }),
          ...(filtros.clase && filtros.clase !== "Todas" ? { kind: filtros.clase } : {}),
          ...(filtros.estado ? { status: filtros.estado } : {}),
          ...(filtros.disciplina && filtros.disciplina !== "Todas"
            ? { discipline: filtros.disciplina }
            : {}),
        },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      })
      .catch(() => [] as Fila[]);
    return filas.map(aHerramienta);
  },

  async porId(id: string): Promise<Herramienta | null> {
    if (!gridConfigured) return null;
    const f = await gridDb()
      .tool.findUnique({ where: { id } })
      .catch(() => null);
    return f ? aHerramienta(f) : null;
  },

  async crear(datos: DatosHerramienta): Promise<string> {
    const fila = await gridDb().tool.create({
      data: {
        name: datos.name,
        kind: datos.kind ?? "Software",
        description: datos.description ?? null,
        version: datos.version ?? null,
        license: datos.license ?? null,
        discipline: datos.discipline ?? null,
        accent: datos.accent ?? "#32D66B",
        status: datos.status ?? "DISPONIBLE",
        position: datos.position ?? 0,
        active: datos.active ?? true,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editar(id: string, datos: Partial<DatosHerramienta>): Promise<void> {
    await gridDb().tool.update({ where: { id }, data: datos });
  },

  async eliminar(id: string): Promise<void> {
    await gridDb().tool.delete({ where: { id } });
  },
};
