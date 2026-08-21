// Módulo Rutas · DOMINIO · La ruta de aprendizaje.
//
// La regla que define esta sección es el DESBLOQUEO POR ETAPAS: la ruta no es
// una lista, es un camino. Una etapa se abre cuando la anterior está terminada,
// y eso es lo que la distingue de la biblioteca, donde todo está disponible
// desde el primer día.

/** Un tema de una capacitación dentro de la ruta, con su avance. */
export interface TemaRuta {
  id: string;
  code: string;
  title: string;
  kind: string;
  duration: string | null;
  videoUrl: string | null;
  materiales: {
    id: string;
    title: string;
    kind: string;
    url: string | null;
    driveId: string | null;
    downloadable: boolean;
  }[];
  /** Si ya lo dio por visto DENTRO DE ESTA RUTA. */
  completado: boolean;
  /** Si descargó su material. */
  descargado: boolean;
  /** Segundo donde se quedó el video. */
  segundos: number;
}

/** Un elemento de la ruta: una capacitación o un documento. */
export interface ItemRuta {
  id: string;
  /** La capacitación, cuando el elemento es un curso de esta base. */
  trainingId: string | null;
  /** El código del cronograma, cuando el elemento es un documento. */
  resourceCode: string | null;
  title: string;
  duration: string | null;
  position: number;

  /**
   * Los temas, cuando el elemento es una capacitación.
   *
   * La ruta lleva la cuenta TEMA A TEMA: es lo que permite decir "vas por el
   * 3 de 5" en vez de solo "empezado". Para un documento la lista va vacía y
   * el elemento se marca completo de una pieza.
   */
  temas: TemaRuta[];

  /** Si el elemento entero está terminado. Lo rellena la aplicación. */
  completado: boolean;
  /** Si descargó su material (documentos y capacitaciones). */
  descargado: boolean;
}

/** Una etapa: el bloque que agrupa varios elementos con un sentido. */
export interface EtapaRuta {
  id: string;
  code: string;
  name: string;
  description: string | null;
  position: number;
  items: ItemRuta[];
}

/** Una ruta completa. */
export interface Ruta {
  id: string;
  name: string;
  objective: string | null;
  etapas: EtapaRuta[];
}

/** La ruta que le tocó a alguien, con cuándo empezó. */
export interface RutaAsignada {
  ruta: Ruta;
  assignedBy: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

/** En qué punto está una etapa. */
export type EstadoEtapa = "completa" | "en_curso" | "bloqueada";

/**
 * Si una etapa está abierta.
 *
 * La primera siempre lo está; las demás, cuando la anterior está completa. Es
 * lo que convierte la lista en un camino: sin esto, alguien podría empezar por
 * "Entrega" sin haber pasado por "Fundamentos", y la ruta dejaría de significar
 * nada.
 */
export function estadoEtapa(ruta: Ruta, indice: number): EstadoEtapa {
  const etapa = ruta.etapas[indice];
  if (!etapa) return "bloqueada";

  const completa = etapa.items.length > 0 && etapa.items.every(itemCompleto);
  if (completa) return "completa";

  if (indice === 0) return "en_curso";

  const anterior = ruta.etapas[indice - 1];
  const anteriorCompleta = anterior.items.length > 0 && anterior.items.every(itemCompleto);

  return anteriorCompleta ? "en_curso" : "bloqueada";
}

/**
 * Si un elemento está terminado.
 *
 * Una capacitación lo está cuando TODOS sus temas lo están —así el avance de la
 * ruta refleja el trabajo real y no un clic—; un documento, cuando se marcó.
 */
export function itemCompleto(item: ItemRuta): boolean {
  if (item.temas.length > 0) return item.temas.every((t) => t.completado);
  return item.completado;
}

/** Cuántos temas lleva hechos un elemento, para "3 de 5". */
export function avanceItem(item: ItemRuta): { hechos: number; total: number; pct: number } {
  if (item.temas.length === 0) {
    const hechos = item.completado ? 1 : 0;
    return { hechos, total: 1, pct: hechos * 100 };
  }
  const hechos = item.temas.filter((t) => t.completado).length;
  return {
    hechos,
    total: item.temas.length,
    pct: Math.round((hechos / item.temas.length) * 100),
  };
}

export function estiloEtapa(estado: EstadoEtapa): { soft: string; ink: string; label: string } {
  return {
    completa: { soft: "#E4F8EB", ink: "#178A49", label: "Completa" },
    en_curso: { soft: "#DDF7F4", ink: "#22726F", label: "En curso" },
    bloqueada: { soft: "#EDF2F7", ink: "#A9B7C6", label: "Bloqueada" },
  }[estado];
}

/** El avance global de una ruta. */
export interface AvanceRuta {
  hechos: number;
  total: number;
  pct: number;
  /** El siguiente elemento por hacer, en la primera etapa abierta. */
  siguiente: ItemRuta | null;
  /** El nombre de la etapa donde está ese siguiente. */
  etapaActual: string | null;
  completa: boolean;
}

/**
 * Cómo va alguien en su ruta.
 *
 * Se cuenta sobre TODOS los elementos, incluidos los de etapas bloqueadas: el
 * porcentaje responde "cuánto me falta para terminar la ruta", y excluir lo
 * bloqueado daría un 100% con medio camino sin hacer.
 */
export function avanceRuta(ruta: Ruta): AvanceRuta {
  const items = ruta.etapas.flatMap((e) => e.items);
  const hechos = items.filter((i) => itemCompleto(i)).length;

  let siguiente: ItemRuta | null = null;
  let etapaActual: string | null = null;

  for (let i = 0; i < ruta.etapas.length; i++) {
    if (estadoEtapa(ruta, i) !== "en_curso") continue;
    const pendiente = ruta.etapas[i].items.find((it) => !itemCompleto(it));
    if (pendiente) {
      siguiente = pendiente;
      etapaActual = ruta.etapas[i].name;
      break;
    }
  }

  return {
    hechos,
    total: items.length,
    pct: items.length === 0 ? 0 : Math.round((hechos / items.length) * 100),
    siguiente,
    etapaActual,
    completa: items.length > 0 && hechos === items.length,
  };
}

/**
 * Si un elemento concreto se puede abrir.
 *
 * Depende de su etapa, no de él mismo: dentro de una etapa abierta se puede ir
 * en el orden que se quiera, porque forzar también el orden interno resulta
 * rígido sin aportar nada.
 */
export function itemAbierto(ruta: Ruta, itemId: string): boolean {
  for (let i = 0; i < ruta.etapas.length; i++) {
    if (ruta.etapas[i].items.some((it) => it.id === itemId)) {
      return estadoEtapa(ruta, i) !== "bloqueada";
    }
  }
  return false;
}
