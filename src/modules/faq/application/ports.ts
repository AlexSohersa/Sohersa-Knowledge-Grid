// Módulo FAQ · APLICACIÓN · Ports (contratos).

import type { Faq } from "../domain/faq";

export interface FiltrosFaq {
  busqueda?: string;
  categoria?: string;
  /** Incluir las no publicadas. Solo para Administración. */
  incluirBorradores?: boolean;
}

export interface DatosFaq {
  category: string;
  question: string;
  answer: string;
  steps?: string[];
  resourceCode?: string | null;
  trainingId?: string | null;
  toolId?: string | null;
  fromQuestionId?: string | null;
  position?: number;
  published?: boolean;
}

export interface RepositorioFaq {
  /** `email` sirve para saber qué votó quien mira, no para filtrar. */
  listar(email: string, filtros: FiltrosFaq): Promise<Faq[]>;
  porId(email: string, id: string): Promise<Faq | null>;

  crear(datos: DatosFaq, creadaPor: string): Promise<string>;
  editar(id: string, datos: Partial<DatosFaq>): Promise<void>;
  eliminar(id: string): Promise<void>;

  /**
   * Registra el voto de una persona sobre si la FAQ le sirvió.
   *
   * Devuelve los contadores ya actualizados para que la interfaz no tenga que
   * pedirlos otra vez.
   */
  votar(
    id: string,
    email: string,
    util: boolean,
  ): Promise<{ helpful: number; notHelpful: number }>;

  /**
   * El contenido de una FAQ, sin datos de quien mira.
   *
   * Existe aparte de `porId` para las operaciones que no tienen persona
   * delante —validar una edición, promover desde comunidad—: pedirles un correo
   * obligaría a inventar uno y a que el repositorio consultara votos que nadie
   * va a usar.
   */
  contenido(id: string): Promise<Faq | null>;

  /** Si ya existe una FAQ creada desde esa pregunta de comunidad. */
  porPreguntaOrigen(preguntaId: string): Promise<Faq | null>;
}
