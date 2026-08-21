// Módulo Capacitaciones · DOMINIO · La capacitación como fuente de información.
//
// Lógica pura.
//
// IMPORTANTE — una capacitación NO lleva avance.
//
// Es una fuente de consulta: alguien necesita ver un video, una presentación o
// un documento y viene aquí a buscarlo, sin que nadie le lleve la cuenta de qué
// ha visto. Marcar "leído" en material de consulta no aporta nada y ensucia la
// pantalla con estado que a nadie le importa.
//
// El avance existe en OTRO sitio: en la ruta de aprendizaje, donde sí hay un
// camino asignado que alguien debe completar. Ver `modules/rutas`.

/** Un material de apoyo: la presentación, el PDF, el archivo guía. */
export interface Material {
  id: string;
  title: string;
  /** PDF · PPT · XLS · RVT · ZIP · CANVA · LINK. */
  kind: string;
  url: string | null;
  driveId: string | null;
  sizeText: string | null;
  downloadable: boolean;
}

/** Un tema de la capacitación: un video, una presentación, un ejercicio. */
export interface Tema {
  id: string;
  code: string;
  title: string;
  summary: string | null;
  /** Video · Presentación · Ejercicio · Lectura. */
  kind: string;
  duration: string | null;
  videoUrl: string | null;
  materials: Material[];
}

/** Una capacitación completa. */
export interface Capacitacion {
  id: string;
  title: string;
  summary: string | null;
  objectives: string[];
  instructor: string | null;
  instructorRole: string | null;
  duration: string | null;
  durationMin: number;
  level: string;
  category: string | null;
  software: string | null;
  accent: string;
  status: string;
  period: string | null;
  views: number;
  temas: Tema[];
}

/** Colores del nivel. Del básico al avanzado, de verde a naranja. */
export function estiloNivel(nivel: string): { soft: string; ink: string } {
  const n = nivel.toLowerCase();
  if (n.startsWith("avan")) return { soft: "#FCE9EA", ink: "#C23840" };
  if (n.startsWith("inter")) return { soft: "#FDF3DC", ink: "#B07C10" };
  return { soft: "#E4F8EB", ink: "#178A49" };
}

/**
 * De dónde sale el video de un tema y cómo se incrusta.
 *
 * Se reconocen las tres formas en que el equipo guarda un video —Drive,
 * YouTube o un enlace directo— porque obligar a una sola haría que la mitad de
 * las capacitaciones no se pudieran cargar. `null` cuando no hay video: el tema
 * puede ser un ejercicio o una lectura.
 */
export type FuenteVideo =
  | { tipo: "drive"; src: string }
  | { tipo: "youtube"; src: string }
  | { tipo: "archivo"; src: string }
  | null;

export function fuenteVideo(url: string | null | undefined): FuenteVideo {
  if (!url) return null;

  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)?.[1];
  if (drive) return { tipo: "drive", src: `https://drive.google.com/file/d/${drive}/preview` };

  const yt =
    url.match(/youtube\.com\/watch\?v=([\w-]+)/)?.[1] ??
    url.match(/youtu\.be\/([\w-]+)/)?.[1] ??
    url.match(/youtube\.com\/embed\/([\w-]+)/)?.[1];
  // `rel=0` evita que al terminar aparezcan videos de otros canales, que en una
  // capacitación interna resulta desconcertante.
  if (yt) return { tipo: "youtube", src: `https://www.youtube.com/embed/${yt}?rel=0` };

  return { tipo: "archivo", src: url };
}

/**
 * Si una capacitación se muestra en la biblioteca.
 *
 * Solo las publicadas. El borrador es el que se está armando desde
 * Administración y enseñarlo a medias haría que alguien empezara un curso
 * incompleto.
 */
export function estaPublicada(cap: Pick<Capacitacion, "status">): boolean {
  return cap.status === "PUBLICADA";
}

/** Suma la duración de los temas cuando la capacitación no la declara. */
export function duracionTotalMin(cap: Capacitacion, minutosDeTexto: (t: string | null) => number): number {
  if (cap.durationMin > 0) return cap.durationMin;
  return cap.temas.reduce((suma, t) => suma + minutosDeTexto(t.duration), 0);
}
