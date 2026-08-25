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

  /* ── La ficha del problema ──────────────────────────────────────────────
   * Todo opcional: una FAQ escrita a mano —"¿cada cuánto subo mi modelo?"—
   * no tiene código ni captura de error, y sigue siendo una FAQ válida.
   * Solo las fichas del catálogo BIM las llevan. */

  /** El código del catálogo: `RVT-041`. Es como el equipo se refiere a ella. */
  code: string | null;
  /** El software donde ocurre: Revit, Autodesk Forma… */
  platform: string | null;
  /** El mensaje de error tal cual lo muestra el programa. */
  errorMessage: string | null;
  /** Qué se ve cuando pasa. */
  symptom: string | null;
  /** Por qué pasa. Puede faltar. */
  cause: string | null;
  /** La otra vía, cuando la recomendada no aplica. */
  altSteps: string[];
  recommendations: string | null;
  /** Términos por los que alguien buscaría esto. */
  keywords: string[];
  /** La captura del error, en Drive. */
  imageDriveId: string | null;
  imageName: string | null;
  /** Otras fichas que conviene mirar, por su código. */
  relatedCodes: string[];

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

/**
 * Si una FAQ es una ficha de problema o una pregunta corriente.
 *
 * Se decide por el código y no por un campo «tipo»: el código es lo que
 * distingue de verdad a una ficha del catálogo, y un campo aparte podría
 * quedar mintiendo si alguien lo cambia sin cambiar lo demás.
 */
export function esFichaProblema(faq: Pick<Faq, "code">): boolean {
  return Boolean(faq.code);
}

/** Los dos ejes por los que se filtra la pantalla. */
export interface FiltrosFaq {
  plataforma?: string;
  categoria?: string;
  busqueda?: string;
}

/** Una opción de filtro con cuántas fichas le corresponden. */
export interface OpcionFiltro {
  valor: string;
  total: number;
}

/**
 * Las opciones de plataforma y categoría, con su cuenta.
 *
 * Se calculan sobre el conjunto YA filtrado por el otro eje, no sobre el total:
 * si alguien elige Revit, la lista de categorías debe decir cuántas fichas de
 * Revit hay en cada una. Mostrar el total global llevaría a elegir una
 * combinación que devuelve cero resultados.
 */
export function opcionesDe(faqs: Faq[], campo: "platform" | "category"): OpcionFiltro[] {
  const cuenta = new Map<string, number>();

  for (const f of faqs) {
    const v = f[campo];
    if (!v) continue;
    cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  }

  return [...cuenta.entries()]
    .map(([valor, total]) => ({ valor, total }))
    .sort((a, b) => b.total - a.total || a.valor.localeCompare(b.valor, "es"));
}

/** Quita acentos y baja a minúsculas, para comparar como escribe la gente. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Aplica los filtros de la pantalla.
 *
 * La búsqueda mira también el CÓDIGO y las PALABRAS CLAVE, no solo el título:
 * quien ya conoce una ficha la busca por «RVT-041», y quien no la conoce
 * escribe el término con el que piensa el problema —«lento», «no se ve»—, que
 * es justo para lo que están las palabras clave.
 */
export function filtrar(faqs: Faq[], filtros: FiltrosFaq): Faq[] {
  let out = faqs;

  if (filtros.plataforma) {
    out = out.filter((f) => f.platform === filtros.plataforma);
  }
  if (filtros.categoria) {
    out = out.filter((f) => f.category === filtros.categoria);
  }

  const q = filtros.busqueda?.trim();
  if (q) {
    const aguja = normalizar(q);
    out = out.filter((f) =>
      normalizar(
        [f.code ?? "", f.question, f.answer, f.symptom ?? "", f.errorMessage ?? "", ...f.keywords].join(" "),
      ).includes(aguja),
    );
  }

  return out;
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

/* ═══════════════════════════════════════════════════════════════════════════
 * LOS CÓDIGOS DEL CATÁLOGO
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * El prefijo que le toca a cada software.
 *
 * Es la nomenclatura del área: `RVT-###` para Revit, `FRM-###` para Autodesk
 * Forma. Lo demás cae en `GEN`, que es mejor que inventar un prefijo nuevo por
 * cada herramienta que aparezca —la lista la decide el área, no la aplicación—.
 */
const PREFIJOS: Record<string, string> = {
  revit: "RVT",
  "autodesk forma": "FRM",
  forma: "FRM",
  navisworks: "NAV",
  autocad: "ACA",
  "desktop connector": "DCN",
};

export function prefijoDe(plataforma: string | null | undefined): string {
  if (!plataforma) return "GEN";
  return PREFIJOS[plataforma.trim().toLowerCase()] ?? "GEN";
}

/**
 * El siguiente código libre de una serie.
 *
 * Se toma el MAYOR de los existentes y se suma uno, en vez de contar cuántos
 * hay: la serie tiene huecos a propósito —el catálogo del área no reutiliza un
 * código retirado— y contar acabaría proponiendo uno que ya se usó.
 *
 * `usados` son los códigos que ya existen, en cualquier orden.
 */
export function siguienteCodigo(prefijo: string, usados: string[]): string {
  let mayor = 0;

  for (const c of usados) {
    const m = c.trim().toUpperCase().match(/^([A-Z]{2,4})-(\d+)$/);
    if (!m || m[1] !== prefijo) continue;
    const n = Number(m[2]);
    if (Number.isFinite(n) && n > mayor) mayor = n;
  }

  return `${prefijo}-${String(mayor + 1).padStart(3, "0")}`;
}
