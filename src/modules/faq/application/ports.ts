// Módulo FAQ · APLICACIÓN · Ports (contratos).

import type { Faq } from "../domain/faq";

export interface FiltrosFaq {
  busqueda?: string;
  categoria?: string;
  /** El software: Revit, Autodesk Forma… Es el primer filtro de la pantalla. */
  plataforma?: string;
  /** Incluir las no publicadas. Solo para Administración. */
  incluirBorradores?: boolean;
}

export interface DatosFaq {
  category: string;
  question: string;
  answer: string;
  steps?: string[];

  /* La ficha del problema. Todo opcional: una FAQ escrita a mano no la lleva. */
  code?: string | null;
  platform?: string | null;
  errorMessage?: string | null;
  symptom?: string | null;
  cause?: string | null;
  altSteps?: string[];
  recommendations?: string | null;
  keywords?: string[];
  imageDriveId?: string | null;
  imageName?: string | null;
  relatedCodes?: string[];

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


/* ═══════════════════════════════════════════════════════════════════════════
 * PROPUESTAS · lo que el equipo manda y alguien revisa
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Lo que llena quien propone una ficha nueva. */
export interface DatosPropuesta {
  title: string;
  description: string;
  platform?: string | null;
  solution?: string | null;
  imageDriveId?: string | null;
  imageName?: string | null;
}

/** Una propuesta, como la ve la bandeja de Administración. */
export interface Propuesta {
  id: string;
  title: string;
  description: string;
  platform: string | null;
  solution: string | null;
  imageDriveId: string | null;
  imageName: string | null;

  email: string;
  authorName: string;
  authorArea: string | null;

  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  faqId: string | null;

  createdAt: Date;
}

export interface RepositorioPropuestas {
  crear(
    datos: DatosPropuesta,
    autor: { email: string; nombre: string; area: string | null },
  ): Promise<string>;

  listar(estado?: Propuesta["status"]): Promise<Propuesta[]>;
  porId(id: string): Promise<Propuesta | null>;
  /** Cuántas esperan revisión. Alimenta el contador del menú. */
  pendientes(): Promise<number>;

  resolver(
    id: string,
    resolucion: {
      status: "APROBADA" | "RECHAZADA";
      reviewedBy: string;
      reviewNote?: string | null;
      faqId?: string | null;
    },
  ): Promise<void>;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * COMENTARIOS · los mensajes al área de Estandarización y Calidad
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface Comentario {
  id: string;
  message: string;
  faqId: string | null;
  email: string;
  authorName: string;
  authorArea: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  /** PENDIENTE · ACEPTADO · RECHAZADO */
  status: string;
  reviewNote: string | null;
  createdAt: Date;
}

export interface RepositorioComentarios {
  crear(
    datos: { message: string; faqId?: string | null },
    autor: { email: string; nombre: string; area: string | null },
  ): Promise<string>;

  listar(soloPendientes?: boolean): Promise<Comentario[]>;
  pendientes(): Promise<number>;
  resolver(id: string, resueltoPor: string): Promise<void>;

  /** Aceptar publica el comentario bajo su ficha. */
  aceptar(id: string, aceptadoPor: string): Promise<void>;
  rechazar(id: string, rechazadoPor: string, motivo: string): Promise<void>;
  /** Los aceptados de una ficha, para pintarlos debajo de ella. */
  aceptadosDe(faqId: string): Promise<Comentario[]>;
}
