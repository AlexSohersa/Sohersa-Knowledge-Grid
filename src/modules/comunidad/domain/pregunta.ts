// Módulo Comunidad · DOMINIO · Preguntas, respuestas y validación.
//
// Aquí vive la regla que define el producto: una respuesta se convierte en
// SOLUCIÓN cuando un administrador la valida, y puede haber varias soluciones
// numeradas. Es lógica pura y se prueba con objetos literales.

/** Una respuesta de la comunidad. */
export interface Respuesta {
  id: string;
  body: string;
  email: string;
  authorName: string;
  authorRole: string | null;
  /** Cuándo se validó como solución. `null` = no validada. */
  validatedAt: Date | null;
  validatedBy: string | null;
  /** Cuántas personas la votaron. */
  votos: number;
  /** Si quien mira ya votó, para pintar el botón activo. */
  votadaPorMi: boolean;
  comentarios: Comentario[];
  createdAt: Date;
}

export interface Comentario {
  id: string;
  body: string;
  email: string;
  authorName: string;
  createdAt: Date;
}

/** Una pregunta abierta del equipo. */
export interface Pregunta {
  id: string;
  title: string;
  body: string;
  email: string;
  authorName: string;
  authorRole: string | null;
  category: string;
  software: string | null;
  tags: string[];
  views: number;
  closed: boolean;
  respuestas: Respuesta[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * En qué punto está una pregunta.
 *
 * Se DERIVA de sus respuestas en vez de guardarse en una columna: un estado
 * guardado habría que recalcularlo en cada alta, cada validación y cada borrado,
 * y bastaría con olvidar uno para que la pregunta mintiera. Derivándolo, siempre
 * corresponde a lo que hay.
 */
export type EstadoPregunta = "resuelta" | "respondida" | "sin_responder";

export function estadoPregunta(p: Pick<Pregunta, "respuestas">): EstadoPregunta {
  if (p.respuestas.some((r) => r.validatedAt !== null)) return "resuelta";
  if (p.respuestas.length > 0) return "respondida";
  return "sin_responder";
}

export function etiquetaEstado(estado: EstadoPregunta): string {
  return {
    resuelta: "Resuelta",
    respondida: "Respondida",
    sin_responder: "Sin responder",
  }[estado];
}

export function estiloEstado(estado: EstadoPregunta): { soft: string; ink: string } {
  return {
    resuelta: { soft: "#E4F8EB", ink: "#178A49" },
    respondida: { soft: "#DDF7F4", ink: "#22726F" },
    sin_responder: { soft: "#FDF3DC", ink: "#B07C10" },
  }[estado];
}

/**
 * Las respuestas ordenadas como se muestran.
 *
 * Primero las validadas, en el orden en que se validaron —esa es la numeración
 * "Solución 1", "Solución 2"—; después el resto, por votos y luego por
 * antigüedad.
 *
 * Que puedan convivir VARIAS soluciones es deliberado: a menudo hay más de un
 * camino correcto, y esconder el segundo empobrece la respuesta. El orden de
 * validación decide cuál es la principal.
 */
export function ordenarRespuestas(respuestas: Respuesta[]): Respuesta[] {
  const validadas = respuestas
    .filter((r) => r.validatedAt !== null)
    .sort((a, b) => a.validatedAt!.getTime() - b.validatedAt!.getTime());

  const resto = respuestas
    .filter((r) => r.validatedAt === null)
    .sort((a, b) => b.votos - a.votos || a.createdAt.getTime() - b.createdAt.getTime());

  return [...validadas, ...resto];
}

/**
 * El número de solución de una respuesta: 1, 2, 3… o `null` si no está validada.
 *
 * Se calcula sobre la lista ya ordenada para que el número coincida con el
 * lugar en que se pinta.
 */
export function numeroSolucion(respuestas: Respuesta[], id: string): number | null {
  const validadas = ordenarRespuestas(respuestas).filter((r) => r.validatedAt !== null);
  const i = validadas.findIndex((r) => r.id === id);
  return i === -1 ? null : i + 1;
}

/**
 * Quién puede validar una respuesta.
 *
 * Solo administración. Es lo que separa esta sección de un foro cualquiera: que
 * alguien responsable diga "esta es la forma correcta" convierte la
 * conversación en conocimiento fiable. Si validara cualquiera, la marca no
 * significaría nada.
 */
export function puedeValidar(esAdmin: boolean): boolean {
  return esAdmin;
}

/**
 * Quién puede editar o borrar una respuesta: su autor, o administración.
 *
 * El autor porque puede querer corregirse; administración porque tiene que
 * poder retirar algo incorrecto que ya se validó.
 */
export function puedeEditarRespuesta(
  respuesta: Pick<Respuesta, "email">,
  email: string,
  esAdmin: boolean,
): boolean {
  return esAdmin || respuesta.email.toLowerCase() === email.toLowerCase();
}

/** Lo mismo para una pregunta. */
export function puedeEditarPregunta(
  pregunta: Pick<Pregunta, "email">,
  email: string,
  esAdmin: boolean,
): boolean {
  return esAdmin || pregunta.email.toLowerCase() === email.toLowerCase();
}

/**
 * Si alguien puede votar una respuesta.
 *
 * Nadie vota la suya: el voto sirve para que el equipo señale qué respuesta le
 * sirvió, y votarse a uno mismo solo añade ruido al contador.
 */
export function puedeVotar(respuesta: Pick<Respuesta, "email">, email: string): boolean {
  return respuesta.email.toLowerCase() !== email.toLowerCase();
}

/**
 * Validación de una pregunta nueva antes de publicarla.
 *
 * Los mínimos son bajos a propósito —no se trata de poner barreras— pero un
 * título de tres letras o un cuerpo vacío no son una pregunta que alguien pueda
 * responder, y publicarla solo genera una conversación fallida.
 */
export interface ErroresPregunta {
  /*
   * La firma de índice permite pasar este objeto donde se espera un mapa de
   * errores genérico —el `Resultado` de la aplicación— sin perder los nombres
   * de campo, que son los que la interfaz usa para marcar cada casilla.
   */
  [campo: string]: string | undefined;
  title?: string;
  body?: string;
  category?: string;
}

export function validarPregunta(datos: {
  title: string;
  body: string;
  category: string;
}): ErroresPregunta {
  const errores: ErroresPregunta = {};

  const title = datos.title.trim();
  if (title.length < 10) {
    errores.title = "Escribe un título de al menos 10 caracteres.";
  } else if (title.length > 180) {
    errores.title = "El título es demasiado largo; resume la pregunta.";
  }

  if (datos.body.trim().length < 20) {
    errores.body = "Explica el problema con al menos 20 caracteres para que puedan ayudarte.";
  }

  if (!datos.category.trim()) {
    errores.category = "Elige una categoría.";
  }

  return errores;
}

export function validarRespuesta(body: string): string | null {
  if (body.trim().length < 15) {
    return "La respuesta es muy corta; explica un poco más.";
  }
  return null;
}

/** `true` si el objeto de errores no tiene ninguno. */
export function sinErrores(errores: Record<string, string | undefined>): boolean {
  return Object.values(errores).every((v) => v === undefined);
}
