// Módulo Capacitaciones · APLICACIÓN · Ports (contratos).
//
// Una capacitación es una FUENTE DE CONSULTA: no hay avance, ni "visto", ni
// porcentaje. Por eso ningún método de lectura recibe un correo — lo que ve una
// persona es exactamente lo que ve otra.

import type { Capacitacion } from "../domain/capacitacion";

/** Filtros de la biblioteca de capacitaciones. */
export interface FiltrosCapacitaciones {
  busqueda?: string;
  categoria?: string;
  nivel?: string;
  software?: string;
  /** Incluir borradores. Solo para Administración. */
  incluirBorradores?: boolean;
}

/** Lo que se necesita para crear o editar una capacitación. */
export interface DatosCapacitacion {
  title: string;
  summary?: string | null;
  objectives?: string[];
  instructor?: string | null;
  instructorRole?: string | null;
  duration?: string | null;
  durationMin?: number;
  level?: string;
  category?: string | null;
  software?: string | null;
  accent?: string;
  status?: string;
  period?: string | null;
}

/** Lo que se necesita para crear o editar un tema. */
export interface DatosTema {
  code: string;
  title: string;
  summary?: string | null;
  kind?: string;
  duration?: string | null;
  videoUrl?: string | null;
  position?: number;
}

/** Lo que se necesita para adjuntar un material a un tema. */
export interface DatosMaterial {
  title: string;
  kind?: string;
  url?: string | null;
  driveId?: string | null;
  sizeText?: string | null;
  downloadable?: boolean;
  position?: number;
}

/** PORT principal de capacitaciones. */
export interface RepositorioCapacitaciones {
  listar(filtros: FiltrosCapacitaciones): Promise<Capacitacion[]>;
  porId(id: string): Promise<Capacitacion | null>;

  /** Suma una vista. Es la única métrica que se guarda. */
  registrarVista(id: string): Promise<void>;

  /* ── Administración ── */
  crear(datos: DatosCapacitacion, creadaPor: string): Promise<string>;
  editar(id: string, datos: Partial<DatosCapacitacion>): Promise<void>;
  eliminar(id: string): Promise<void>;

  agregarTema(capId: string, datos: DatosTema): Promise<string>;
  editarTema(temaId: string, datos: Partial<DatosTema>): Promise<void>;
  eliminarTema(temaId: string): Promise<void>;

  agregarMaterial(temaId: string, datos: DatosMaterial): Promise<string>;
  eliminarMaterial(materialId: string): Promise<void>;
}
