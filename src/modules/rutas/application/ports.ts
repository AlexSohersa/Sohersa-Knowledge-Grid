// Módulo Rutas · APLICACIÓN · Ports (contratos).

import type { Ruta, RutaAsignada } from "../domain/ruta";

export interface DatosRuta {
  name: string;
  objective?: string | null;
  active?: boolean;
}

export interface DatosEtapa {
  code: string;
  name: string;
  description?: string | null;
  position?: number;
}

export interface DatosItemRuta {
  trainingId?: string | null;
  resourceCode?: string | null;
  title: string;
  duration?: string | null;
  position?: number;
}

/** El avance guardado de un elemento (o de un tema dentro de él). */
export interface RegistroAvance {
  itemId: string;
  topicId: string | null;
  completed: boolean;
  downloaded: boolean;
  seconds: number;
}

/**
 * Una asignación con su ruta y su avance.
 *
 * Se devuelven juntos porque el avance NO tiene sentido sin la asignación: la
 * misma capacitación en dos rutas lleva dos cuentas distintas, y el id de la
 * asignación es lo que las separa.
 */
export interface AsignacionConAvance {
  /** Id de la asignación, necesario para escribir avance. */
  assignmentId: string;
  asignada: RutaAsignada;
  avance: RegistroAvance[];
}

export interface RepositorioRutas {
  /**
   * Las rutas activas de una persona, con su avance.
   *
   * Devuelve una LISTA porque alguien puede tener varias asignadas a la vez
   * —lo pidió el negocio— y la pantalla las muestra todas.
   */
  misRutas(email: string): Promise<AsignacionConAvance[]>;

  /** Todas las rutas, para Administración. */
  listar(): Promise<Ruta[]>;
  porId(id: string): Promise<Ruta | null>;

  crear(datos: DatosRuta, creadaPor: string): Promise<string>;
  editar(id: string, datos: Partial<DatosRuta>): Promise<void>;
  eliminar(id: string): Promise<void>;

  agregarEtapa(rutaId: string, datos: DatosEtapa): Promise<string>;
  editarEtapa(etapaId: string, datos: Partial<DatosEtapa>): Promise<void>;
  eliminarEtapa(etapaId: string): Promise<void>;

  agregarItem(etapaId: string, datos: DatosItemRuta): Promise<string>;
  eliminarItem(itemId: string): Promise<void>;

  /** Asigna una ruta a una persona. */
  asignar(rutaId: string, email: string, asignadaPor: string): Promise<void>;
  /** Quita la asignación. */
  desasignar(rutaId: string, email: string): Promise<void>;
  /** A quiénes está asignada una ruta. */
  asignados(rutaId: string): Promise<string[]>;
}

/**
 * PORT de escritura del avance.
 *
 * Separado del repositorio de estructura porque son dos responsabilidades: una
 * mantiene el catálogo de rutas —cosa de administración—, la otra registra lo
 * que hace cada persona al recorrerlas.
 */
export interface RepositorioAvanceRuta {
  marcar(
    assignmentId: string,
    itemId: string,
    topicId: string | null,
    completado: boolean,
  ): Promise<void>;

  marcarDescarga(assignmentId: string, itemId: string, topicId: string | null): Promise<void>;

  guardarPosicion(
    assignmentId: string,
    itemId: string,
    topicId: string | null,
    segundos: number,
  ): Promise<void>;

  /** Comprueba que la asignación es de esta persona antes de escribir. */
  asignacionDe(email: string, pathId: string): Promise<string | null>;
}
