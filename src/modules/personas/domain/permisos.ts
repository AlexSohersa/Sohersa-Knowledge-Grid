// Módulo PERSONAS · DOMINIO · Quién puede hacer qué.
//
// El equipo NO se declara aquí: las personas viven en el padrón (`core.persona`)
// y esta herramienta solo las lee. Lo que sí es suyo son los permisos: quién
// administra y qué secciones ve cada quien.

/** Las secciones que se pueden abrir o cerrar por persona. */
export type Seccion =
  | "biblioteca"
  | "capacitaciones"
  | "ruta"
  | "faq"
  | "comunidad"
  | "herramientas";

/** Cómo se llama cada sección en pantalla, y qué contiene. */
export const SECCIONES: Array<{ id: Seccion; nombre: string; detalle: string }> = [
  { id: "biblioteca", nombre: "Biblioteca", detalle: "Manuales, instructivos y plantillas" },
  { id: "capacitaciones", nombre: "Capacitaciones", detalle: "Videos y material de las sesiones" },
  { id: "ruta", nombre: "Mi ruta", detalle: "El camino de formación asignado" },
  { id: "faq", nombre: "Preguntas frecuentes", detalle: "Las fichas de problemas y su solución" },
  { id: "comunidad", nombre: "Comunidad", detalle: "Preguntas abiertas del equipo" },
  { id: "herramientas", nombre: "Herramientas", detalle: "El software que usa la empresa" },
];

/**
 * Lo que puede hacer una persona.
 *
 * Se separa «administrar» de «revisar FAQ» a propósito: son responsabilidades
 * distintas y suelen recaer en gente distinta. Quien mantiene el catálogo de
 * problemas —Estandarización y Calidad— no tiene por qué poder tocar las rutas
 * de formación ni los permisos de nadie, y al revés.
 */
export interface Permisos {
  /** Administra Knowledge Grid: capacitaciones, rutas, permisos. */
  esAdmin: boolean;
  /** Revisa las propuestas y los comentarios del FAQ. */
  revisaFaq: boolean;
  /**
   * Las secciones que ve. Vacío significa TODAS.
   *
   * El vacío es «sin restricción» y no «sin acceso» porque lo normal es que
   * todo el mundo vea todo: el Centro existe para que el conocimiento circule.
   * Restringir es la excepción, y una lista vacía por descuido no debe dejar a
   * nadie fuera.
   */
  secciones: Seccion[];
}

/** Una persona del padrón, con lo que puede hacer aquí. */
export interface Colaborador {
  personaId: string;
  nombre: string;
  correo: string;
  puesto: string | null;
  area: string | null;
  foto: string | null;
  activo: boolean;
  permisos: Permisos;
}

/** Si esta persona puede abrir una sección. */
export function puedeVer(permisos: Permisos, seccion: Seccion): boolean {
  if (permisos.esAdmin) return true;
  if (permisos.secciones.length === 0) return true;
  return permisos.secciones.includes(seccion);
}

/** Un resumen legible de lo que ve, para la tabla. */
export function resumenAcceso(permisos: Permisos): string {
  if (permisos.esAdmin) return "Todo · administra";
  if (permisos.secciones.length === 0) return "Todas las secciones";
  if (permisos.secciones.length === SECCIONES.length) return "Todas las secciones";

  const nombres = SECCIONES.filter((s) => permisos.secciones.includes(s.id)).map((s) => s.nombre);
  return nombres.join(" · ");
}

/** Agrupa por área, que es como el equipo se piensa a sí mismo. */
export function porArea(colaboradores: Colaborador[]): Array<{ area: string; gente: Colaborador[] }> {
  const mapa = new Map<string, Colaborador[]>();

  for (const c of colaboradores) {
    const area = c.area ?? "Sin área";
    const lista = mapa.get(area) ?? [];
    lista.push(c);
    mapa.set(area, lista);
  }

  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  return [...mapa.entries()]
    .map(([area, gente]) => ({ area, gente }))
    .sort((a, b) => b.gente.length - a.gente.length || a.area.localeCompare(b.area, "es"));
}
