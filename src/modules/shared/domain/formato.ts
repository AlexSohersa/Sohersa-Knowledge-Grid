// Compartido · DOMINIO · Formato de datos para pantalla.
//
// Funciones puras, sin dependencias: se usan igual en el servidor al preparar
// una vista y en el cliente al pintar. Todas devuelven el texto ya listo para
// mostrar, porque el formato es una decisión de producto —"hace 3 h" y no
// "hace 187 minutos"— y no debe repetirse en cada componente.

/**
 * Cuánto hace, en lenguaje natural.
 *
 * Los cortes son los del diseño: hasta un minuto es "hace un momento", y a
 * partir de un mes se dice en meses porque nadie cuenta 47 días.
 */
export function haceCuanto(fecha: Date | string | number | null | undefined): string {
  if (!fecha) return "—";
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return "—";

  const seg = Math.floor((Date.now() - t) / 1000);
  if (seg < 60) return "hace un momento";

  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;

  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;

  const dias = Math.floor(hrs / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;

  const sem = Math.floor(dias / 7);
  if (sem < 5) return `hace ${sem} ${sem === 1 ? "sem" : "sem"}`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;

  const años = Math.floor(dias / 365);
  return `hace ${años} ${años === 1 ? "año" : "años"}`;
}

/** Una fecha larga en español: "18 de agosto de 2026". */
export function fechaLarga(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

/** Una fecha corta: "18 ago 2026". */
export function fechaCorta(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * El tamaño de un archivo, legible.
 *
 * En base 1024 y con un decimal a partir de MB: "8.9 MB" es lo que muestra el
 * diseño, y "8.9421 MB" no le sirve a nadie.
 */
export function tamano(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/**
 * Minutos como duración legible: 160 → "2 h 40 min".
 *
 * Se omite la parte que vale cero: "2 h" y no "2 h 0 min", "45 min" y no
 * "0 h 45 min".
 */
export function duracion(minutos: number | null | undefined): string {
  if (!minutos || minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * Lee una duración escrita a mano y la pasa a minutos.
 *
 * Hace falta porque las duraciones se capturan como texto ("2 h 40 min") —es lo
 * natural para quien da de alta un curso— pero sumarlas exige números. Acepta
 * las formas que la gente escribe de verdad: "45 min", "2h", "1 h 30".
 */
export function minutosDeTexto(texto: string | null | undefined): number {
  if (!texto) return 0;
  const t = texto.toLowerCase();
  const horas = Number(t.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] ?? 0);
  const mins = Number(t.match(/(\d+)\s*m/)?.[1] ?? 0);
  if (horas === 0 && mins === 0) {
    // Un número suelto se entiende como minutos: "40" son 40 minutos.
    const suelto = Number(t.match(/^\s*(\d+)\s*$/)?.[1] ?? 0);
    return suelto;
  }
  return Math.round(horas * 60) + mins;
}

/** Un porcentaje entero y acotado, para barras de avance. */
export function porcentaje(hechos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((hechos / total) * 100)));
}

/**
 * Un plural sencillo: `plural(3, "documento")` → "3 documentos".
 *
 * Cubre el caso regular, que es el 95% de los textos de la interfaz. Los
 * irregulares se escriben a mano donde toque.
 */
export function plural(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + "s")}`;
}
