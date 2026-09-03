// Compartido · DOMINIO · El lenguaje del conocimiento.
//
// Todo lo que vive en el Centro es una de seis cosas, y cada una tiene su color
// en TODO el producto: la píldora del listado, el punto de la sección, el aro
// de la ficha y la pestaña de resultados usan el mismo par. Es lo que permite
// reconocer de un vistazo si algo es un documento, un video o una pregunta sin
// leer la etiqueta.
//
// Vive en el dominio compartido y no en un componente porque seis módulos
// distintos necesitan el mismo mapa, y tenerlo repetido acabaría con seis
// verdes ligeramente distintos.

/** Los seis tipos de conocimiento del Centro. */
export type KindId = "doc" | "cap" | "tool" | "faq" | "com" | "tpl";

export interface KindStyle {
  /** Cómo se llama en plural, para títulos y pestañas. */
  label: string;
  /** La etiqueta corta de la píldora: PDF, VIDEO, SW… */
  ext: string;
  /** Fondo suave de la píldora. */
  soft: string;
  /** Tinta legible sobre ese fondo. */
  ink: string;
  /** El color pleno: puntos, aros y acentos. */
  dot: string;
}

export const KINDS: Record<KindId, KindStyle> = {
  doc: { label: "Documentos", ext: "PDF", soft: "#E9F1FB", ink: "#31677F", dot: "#3E7FA6" },
  cap: { label: "Capacitaciones", ext: "VIDEO", soft: "#E4F8EB", ink: "#178A49", dot: "#32D66B" },
  tool: { label: "Herramientas", ext: "SW", soft: "#DDF7F4", ink: "#22726F", dot: "#39B8B4" },
  faq: { label: "Preguntas frecuentes", ext: "FAQ", soft: "#FDF3DC", ink: "#B07C10", dot: "#F5B843" },
  com: { label: "Comunidad", ext: "Q&A", soft: "#EDEBFC", ink: "#5D50C9", dot: "#8B7CF6" },
  tpl: { label: "Plantillas", ext: "RVT", soft: "#FCE9EA", ink: "#C23840", dot: "#E95E64" },
};

/** El aspecto de un tipo desconocido. Neutro, para que no llame la atención. */
const KIND_DESCONOCIDO: KindStyle = {
  label: "Otro",
  ext: "•",
  soft: "#EDF2F7",
  ink: "#6B7C93",
  dot: "#A9B7C6",
};

/**
 * El estilo de un tipo, sin poder fallar.
 *
 * `KINDS[kind]` directo devuelve `undefined` para cualquier valor que no esté
 * en el catálogo, y leer `.soft` de eso TUMBA la página entera con un error de
 * servidor —una fila vieja o escrita por otra herramienta basta—. El historial y
 * los guardados pintan lo que haya en la base, así que tienen que aguantar un
 * tipo que no reconozcan: mejor un icono neutro que una pantalla en blanco.
 */
export function estiloKind(kind: string): KindStyle {
  return KINDS[kind as KindId] ?? KIND_DESCONOCIDO;
}

/**
 * El color de una extensión de archivo.
 *
 * Es un mapa aparte del de tipos porque responde otra pregunta: el tipo dice
 * QUÉ es (un documento), la extensión dice CÓMO se abre (un Excel). Un mismo
 * documento puede ser PDF o XLS y la píldora tiene que decir la verdad.
 */
export const EXTS: Record<string, { soft: string; ink: string }> = {
  PDF: { soft: "#FCE9EA", ink: "#C23840" },
  XLS: { soft: "#E4F8EB", ink: "#178A49" },
  XLSX: { soft: "#E4F8EB", ink: "#178A49" },
  RVT: { soft: "#E9F1FB", ink: "#31677F" },
  PPT: { soft: "#FDF3DC", ink: "#B07C10" },
  PPTX: { soft: "#FDF3DC", ink: "#B07C10" },
  DOC: { soft: "#E9F1FB", ink: "#31677F" },
  DOCX: { soft: "#E9F1FB", ink: "#31677F" },
  MP4: { soft: "#EDEBFC", ink: "#5D50C9" },
  ZIP: { soft: "#EDEBFC", ink: "#5D50C9" },
  CANVA: { soft: "#DDF7F4", ink: "#22726F" },
  LINK: { soft: "#E9F1FB", ink: "#31677F" },
};

/** El estilo de una extensión; cae a PDF, que es lo más común. */
export function estiloExt(ext: string | null | undefined): { soft: string; ink: string; ext: string } {
  const clave = (ext ?? "PDF").toUpperCase();
  const estilo = EXTS[clave] ?? EXTS.PDF;
  // XLSX se muestra como XLS: la píldora es estrecha y tres letras siempre caben.
  return { ...estilo, ext: clave === "XLSX" ? "XLS" : clave === "PPTX" ? "PPT" : clave };
}

/**
 * La extensión que le corresponde a un archivo por su nombre o su tipo MIME.
 *
 * Se mira primero el nombre porque es lo que ve la persona; el MIME solo entra
 * cuando el nombre no dice nada, que pasa con los archivos nativos de Google
 * (un Documento de Drive no tiene extensión).
 */
export function extDeArchivo(
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): string {
  const porNombre = fileName?.match(/\.([a-z0-9]+)$/i)?.[1];
  if (porNombre) return porNombre.toUpperCase();

  const m = (mimeType ?? "").toLowerCase();
  if (m.includes("spreadsheet") || m.includes("excel")) return "XLS";
  if (m.includes("presentation") || m.includes("powerpoint")) return "PPT";
  if (m.includes("pdf")) return "PDF";
  if (m.includes("video")) return "MP4";
  if (m.includes("document") || m.includes("word")) return "DOC";
  return "LINK";
}

/** Colores de avatar, para que cada persona tenga siempre el mismo. */
const AVATAR_COLORS = [
  "#32D66B",
  "#39B8B4",
  "#8B7CF6",
  "#3E7FA6",
  "#F5B843",
  "#E8825E",
] as const;

/**
 * El color del avatar de alguien, derivado de su nombre.
 *
 * Determinista a propósito: la misma persona tiene el mismo color en toda la
 * herramienta y entre sesiones, sin necesidad de guardarlo en la base. Un color
 * al azar haría que su avatar cambiara al recargar y se perdería el
 * reconocimiento.
 */
export function colorAvatar(nombre: string): string {
  let suma = 0;
  for (let i = 0; i < nombre.length; i++) suma = (suma + nombre.charCodeAt(i)) % 997;
  return AVATAR_COLORS[suma % AVATAR_COLORS.length];
}

/** Iniciales para el avatar: dos letras como mucho. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "??";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}
