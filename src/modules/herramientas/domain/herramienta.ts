// Módulo Herramientas · DOMINIO · El software de la empresa.
//
// Lógica pura. El concepto que aporta este módulo es el ESTADO DE ADOPCIÓN: la
// respuesta a "¿qué está a medias?", que era una de las preguntas que el Centro
// tenía que resolver.

/** Una herramienta: software, plataforma o desarrollo interno. */
export interface Herramienta {
  id: string;
  name: string;
  /** Software · Plataforma · Automatización · Interno. */
  kind: string;
  description: string | null;
  version: string | null;
  license: string | null;
  discipline: string | null;
  accent: string;
  status: EstadoAdopcion;
  position: number;
  active: boolean;
}

/**
 * En qué punto está una herramienta dentro de la empresa.
 *
 * Existe porque el equipo necesita distinguir lo consolidado de lo que todavía
 * se está probando: apoyar un entregable en algo "en evaluación" es arriesgado,
 * y sin esta distinción la lista de herramientas daría a entender que todo está
 * igual de firme.
 */
export type EstadoAdopcion = "DISPONIBLE" | "PILOTO" | "EN_EVALUACION" | "DESCONTINUADO";

export const ESTADOS_ADOPCION: EstadoAdopcion[] = [
  "DISPONIBLE",
  "PILOTO",
  "EN_EVALUACION",
  "DESCONTINUADO",
];

export function etiquetaAdopcion(estado: EstadoAdopcion): string {
  return {
    DISPONIBLE: "Disponible",
    PILOTO: "En piloto",
    EN_EVALUACION: "En evaluación",
    DESCONTINUADO: "Descontinuada",
  }[estado];
}

/**
 * Qué significa cada estado, en una línea.
 *
 * Se guarda junto al color porque la etiqueta sola no basta: "en piloto" puede
 * entenderse de varias formas, y la ficha necesita decir exactamente qué se
 * puede esperar.
 */
export function explicacionAdopcion(estado: EstadoAdopcion): string {
  return {
    DISPONIBLE: "Consolidada. Puedes apoyar entregables en ella.",
    PILOTO: "En prueba con un equipo. Puede cambiar antes de generalizarse.",
    EN_EVALUACION: "Se está valorando. Todavía no es oficial para producción.",
    DESCONTINUADO: "Ya no se usa. Consulta con qué se reemplazó.",
  }[estado];
}

export function estiloAdopcion(estado: EstadoAdopcion): { soft: string; ink: string } {
  return {
    DISPONIBLE: { soft: "#E4F8EB", ink: "#178A49" },
    PILOTO: { soft: "#FDF3DC", ink: "#B07C10" },
    EN_EVALUACION: { soft: "#DDF7F4", ink: "#22726F" },
    DESCONTINUADO: { soft: "#EDF2F7", ink: "#718198" },
  }[estado];
}

/**
 * Si una herramienta es apta para apoyar un entregable.
 *
 * Solo las disponibles. Es la regla que responde de verdad la pregunta que
 * lleva a alguien a esta pantalla: "¿puedo usar esto para el proyecto?".
 */
export function esApta(h: Pick<Herramienta, "status" | "active">): boolean {
  return h.active && h.status === "DISPONIBLE";
}

/** Colores de la clase de herramienta, del lenguaje visual del diseño. */
export function estiloClase(kind: string): { soft: string; ink: string } {
  const k = kind.toLowerCase();
  if (k.startsWith("plata")) return { soft: "#DDF7F4", ink: "#22726F" };
  if (k.startsWith("autom")) return { soft: "#EDEBFC", ink: "#5D50C9" };
  if (k.startsWith("inter")) return { soft: "#FDF3DC", ink: "#B07C10" };
  return { soft: "#E9F1FB", ink: "#31677F" };
}
