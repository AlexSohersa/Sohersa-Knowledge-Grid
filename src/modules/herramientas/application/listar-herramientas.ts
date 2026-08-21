// Módulo Herramientas · APLICACIÓN · Casos de uso.

import { normalizar } from "@/modules/biblioteca/domain/documento";
import type { Herramienta } from "../domain/herramienta";
import type {
  ConocimientoPorHerramienta,
  ConteosHerramienta,
  DatosHerramienta,
  FiltrosHerramientas,
  RepositorioHerramientas,
} from "./ports";

export interface Deps {
  repo: RepositorioHerramientas;
  conocimiento: ConocimientoPorHerramienta;
}

/** Una herramienta con lo que hay colgado de ella. */
export interface HerramientaConConocimiento {
  herramienta: Herramienta;
  conteos: ConteosHerramienta;
}

export interface VistaHerramientas {
  items: HerramientaConConocimiento[];
  clases: string[];
  disciplinas: string[];
  /** Cuántas están consolidadas y cuántas todavía se están probando. */
  disponibles: number;
  enPrueba: number;
}

const SIN_CONOCIMIENTO: ConteosHerramienta = {
  documentos: 0,
  capacitaciones: 0,
  faq: 0,
  preguntas: 0,
};

/**
 * Las herramientas de la empresa, cada una con su conocimiento asociado.
 *
 * Los conteos se piden en UNA llamada para toda la lista: es lo que permite
 * mostrar "10 documentos · 1 capacitación · 2 FAQ" en cada fila sin que la
 * pantalla haga decenas de consultas.
 */
export async function listarHerramientas(
  { repo, conocimiento }: Deps,
  filtros: FiltrosHerramientas = {},
): Promise<VistaHerramientas> {
  let herramientas = await repo.listar(filtros);

  // El texto se filtra aquí, sin acentos, igual que en el resto del Centro.
  if (filtros.busqueda?.trim()) {
    const palabras = normalizar(filtros.busqueda).split(/\s+/).filter(Boolean);
    herramientas = herramientas.filter((h) => {
      const heno = normalizar(
        [h.name, h.description, h.kind, h.discipline, h.version].filter(Boolean).join(" "),
      );
      return palabras.every((p) => heno.includes(p));
    });
  }

  const conteos = await conocimiento.contar(herramientas);

  const clases = new Set<string>();
  const disciplinas = new Set<string>();
  for (const h of herramientas) {
    if (h.kind) clases.add(h.kind);
    if (h.discipline) disciplinas.add(h.discipline);
  }

  return {
    items: herramientas.map((herramienta) => ({
      herramienta,
      conteos: conteos.get(herramienta.id) ?? SIN_CONOCIMIENTO,
    })),
    clases: [...clases].sort((a, b) => a.localeCompare(b, "es")),
    disciplinas: [...disciplinas].sort((a, b) => a.localeCompare(b, "es")),
    disponibles: herramientas.filter((h) => h.status === "DISPONIBLE").length,
    enPrueba: herramientas.filter((h) => h.status === "PILOTO" || h.status === "EN_EVALUACION")
      .length,
  };
}

export async function verHerramienta(
  { repo }: Pick<Deps, "repo">,
  id: string,
): Promise<Herramienta | null> {
  return repo.porId(id);
}

export async function crearHerramienta(
  { repo }: Pick<Deps, "repo">,
  datos: DatosHerramienta,
): Promise<string> {
  return repo.crear(datos);
}

export async function editarHerramienta(
  { repo }: Pick<Deps, "repo">,
  id: string,
  datos: Partial<DatosHerramienta>,
): Promise<void> {
  await repo.editar(id, datos);
}

/**
 * Dar de baja una herramienta.
 *
 * Se marca inactiva en vez de borrarla: puede estar referenciada desde una FAQ
 * o una capacitación, y borrarla dejaría esos enlaces apuntando a nada. Además,
 * saber qué se dejó de usar es información útil por sí misma.
 */
export async function darDeBajaHerramienta(
  { repo }: Pick<Deps, "repo">,
  id: string,
): Promise<void> {
  await repo.editar(id, { active: false, status: "DESCONTINUADO" });
}
