// Módulo Herramientas · APLICACIÓN · Ports (contratos).

import type { EstadoAdopcion, Herramienta } from "../domain/herramienta";

export interface FiltrosHerramientas {
  busqueda?: string;
  /** Software · Plataforma · Automatización · Interno. */
  clase?: string;
  estado?: EstadoAdopcion;
  disciplina?: string;
  /** Incluir las dadas de baja. Solo para Administración. */
  incluirInactivas?: boolean;
}

export interface DatosHerramienta {
  name: string;
  kind?: string;
  description?: string | null;
  version?: string | null;
  license?: string | null;
  discipline?: string | null;
  accent?: string;
  status?: EstadoAdopcion;
  position?: number;
  active?: boolean;
}

export interface RepositorioHerramientas {
  listar(filtros: FiltrosHerramientas): Promise<Herramienta[]>;
  porId(id: string): Promise<Herramienta | null>;

  crear(datos: DatosHerramienta): Promise<string>;
  editar(id: string, datos: Partial<DatosHerramienta>): Promise<void>;
  eliminar(id: string): Promise<void>;
}

/**
 * Cuánto conocimiento hay colgado de una herramienta.
 *
 * Es lo que convierte el catálogo en lo que promete el diseño: "cada
 * herramienta es un pequeño centro de conocimiento". Sin estos números, la
 * lista sería un inventario de software; con ellos, es una puerta a todo lo que
 * la empresa sabe sobre cada una.
 */
export interface ConteosHerramienta {
  documentos: number;
  capacitaciones: number;
  faq: number;
  preguntas: number;
}

/**
 * PORT hacia los demás módulos.
 *
 * Herramientas NO conoce las tablas de biblioteca, capacitaciones, FAQ ni
 * comunidad: declara este contrato y cada módulo aporta su parte. Es el mismo
 * patrón que Comunidad → FAQ y Rutas → Capacitaciones.
 */
export interface ConocimientoPorHerramienta {
  /**
   * Los conteos de varias herramientas a la vez.
   *
   * Recibe la lista entera en vez de una por una: con seis herramientas en
   * pantalla, preguntar de una en una multiplicaría por seis las idas a la
   * base para obtener cuatro números por fila.
   */
  contar(herramientas: Herramienta[]): Promise<Map<string, ConteosHerramienta>>;
}
