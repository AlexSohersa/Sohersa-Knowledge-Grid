// Módulo FAQ · DOMINIO · Preguntas frecuentes.
//
// La FAQ es DOCTRINA: la respuesta que la empresa sostiene. Se separa de la
// comunidad —que es conversación— porque se leen distinto y se mantienen
// distinto: una FAQ la escribe o aprueba administración, y no se vota, se marca
// como útil.

/** Una pregunta frecuente con su respuesta oficial. */
export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  /** Los pasos concretos, cuando la respuesta es un procedimiento. */
  steps: string[];

  /** Enlaces a lo relacionado. Cada uno opcional. */
  resourceCode: string | null;
  trainingId: string | null;
  toolId: string | null;
  /** La pregunta de comunidad que la originó, si vino de ahí. */
  fromQuestionId: string | null;

  helpful: number;
  notHelpful: number;
  position: number;
  published: boolean;

  /** Qué votó quien mira: `null` si todavía no ha votado. */
  miVoto: boolean | null;
}

/** Una categoría con sus preguntas, como se agrupan en la pantalla. */
export interface CategoriaFaq {
  name: string;
  items: Faq[];
}

/**
 * Agrupa las FAQ por categoría.
 *
 * Las categorías salen por número de preguntas, de mayor a menor: la categoría
 * más consultada es la que más gente necesita, y ponerla arriba ahorra un
 * desplazamiento a la mayoría.
 */
export function agruparPorCategoria(faqs: Faq[]): CategoriaFaq[] {
  const mapa = new Map<string, Faq[]>();

  for (const f of faqs) {
    const lista = mapa.get(f.category) ?? [];
    lista.push(f);
    mapa.set(f.category, lista);
  }

  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.position - b.position || b.helpful - a.helpful);
  }

  return [...mapa.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, "es"));
}

/**
 * Qué tan útil resultó una FAQ, de 0 a 100.
 *
 * `null` cuando nadie ha votado: mostrar "0% útil" sin votos sería injusto con
 * una respuesta que sencillamente es nueva.
 */
export function utilidad(faq: Pick<Faq, "helpful" | "notHelpful">): number | null {
  const total = faq.helpful + faq.notHelpful;
  if (total === 0) return null;
  return Math.round((faq.helpful / total) * 100);
}

/**
 * Si una FAQ debería revisarse.
 *
 * Cuando la mayoría dice que no le sirvió, la respuesta oficial está fallando y
 * alguien tiene que mirarla. Se pide un mínimo de votos para no marcar como
 * mala una respuesta por un solo voto negativo.
 */
export function necesitaRevision(faq: Pick<Faq, "helpful" | "notHelpful">): boolean {
  const total = faq.helpful + faq.notHelpful;
  if (total < 4) return false;
  const pct = utilidad(faq);
  return pct !== null && pct < 50;
}

/** Validación antes de guardar una FAQ. */
export interface ErroresFaq {
  /* Ver la nota en `ErroresPregunta`: la firma de índice es lo que deja pasar
     este objeto como mapa de errores genérico. */
  [campo: string]: string | undefined;
  question?: string;
  answer?: string;
  category?: string;
}

export function validarFaq(datos: {
  question: string;
  answer: string;
  category: string;
}): ErroresFaq {
  const errores: ErroresFaq = {};

  if (datos.question.trim().length < 8) {
    errores.question = "Escribe la pregunta completa.";
  }
  if (datos.answer.trim().length < 15) {
    errores.answer = "La respuesta es muy corta para ser útil.";
  }
  if (!datos.category.trim()) {
    errores.category = "Elige una categoría.";
  }

  return errores;
}
