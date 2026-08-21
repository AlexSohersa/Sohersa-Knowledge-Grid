// Módulo Comunidad · APLICACIÓN · Ports (contratos).

import type { Pregunta } from "../domain/pregunta";

export interface FiltrosComunidad {
  busqueda?: string;
  categoria?: string;
  /** resuelta · respondida · sin_responder. */
  estado?: string;
  /** Solo las que preguntó esta persona. */
  soloMias?: boolean;
}

export interface DatosPregunta {
  title: string;
  body: string;
  category: string;
  software?: string | null;
  tags?: string[];
}

/** Quién pregunta o responde, tal como se guarda en el momento. */
export interface Autor {
  email: string;
  name: string;
  role: string | null;
}

export interface RepositorioComunidad {
  /**
   * Lista las preguntas. `email` sirve para saber qué respuestas votó quien
   * mira, no para filtrar: la comunidad es visible para todo el equipo.
   */
  listar(email: string, filtros: FiltrosComunidad): Promise<Pregunta[]>;
  porId(email: string, id: string): Promise<Pregunta | null>;

  crear(datos: DatosPregunta, autor: Autor): Promise<string>;
  editarPregunta(id: string, datos: Partial<DatosPregunta>): Promise<void>;
  eliminarPregunta(id: string): Promise<void>;
  registrarVista(id: string): Promise<void>;

  responder(preguntaId: string, body: string, autor: Autor): Promise<string>;
  editarRespuesta(respuestaId: string, body: string): Promise<void>;
  eliminarRespuesta(respuestaId: string): Promise<void>;

  /** Marca o desmarca una respuesta como solución. */
  validarRespuesta(respuestaId: string, validadaPor: string | null): Promise<void>;

  /** Alterna el voto de una persona. Devuelve el total resultante. */
  alternarVoto(respuestaId: string, email: string): Promise<number>;

  comentar(respuestaId: string, body: string, autor: Autor): Promise<string>;
  eliminarComentario(comentarioId: string): Promise<void>;

  /** Para saber si una respuesta es de quien intenta editarla. */
  autorDeRespuesta(respuestaId: string): Promise<string | null>;
  /** La pregunta a la que pertenece una respuesta, para revalidar rutas. */
  preguntaDeRespuesta(respuestaId: string): Promise<string | null>;
}

/**
 * PORT hacia el módulo de FAQ.
 *
 * Una pregunta bien resuelta puede promoverse a pregunta frecuente. Comunidad
 * NO conoce las tablas de FAQ: pide este contrato y el módulo de FAQ lo
 * implementa. Así se conectan sin acoplarse, igual que Leads y Oportunidades en
 * Deal Engine.
 */
export interface PromoverAFaq {
  promover(datos: {
    preguntaId: string;
    category: string;
    question: string;
    answer: string;
    creadaPor: string;
  }): Promise<{ faqId: string }>;
}
