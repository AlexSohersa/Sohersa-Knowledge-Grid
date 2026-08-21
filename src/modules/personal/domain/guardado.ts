// Módulo Personal · DOMINIO · Guardados e historial.
//
// Lo que es de cada quien: lo que marcó para volver y lo último que abrió.

import type { KindId } from "@/modules/shared/domain/conocimiento";

/** Algo que alguien guardó para volver después. */
export interface Guardado {
  id: string;
  kind: KindId;
  /** Id del elemento en su tabla; para documentos, su código del cronograma. */
  targetId: string;
  title: string;
  createdAt: Date;
}

/** Algo que alguien abrió. */
export interface Visto {
  id: string;
  kind: KindId;
  targetId: string;
  title: string;
  viewedAt: Date;
}

/**
 * La dirección a la que lleva un elemento guardado o visto.
 *
 * Vive en el dominio porque la misma correspondencia la necesitan Guardados,
 * Historial, la búsqueda global y el inicio. Repetirla en cada pantalla haría
 * que un cambio de ruta rompiera unas y otras no.
 */
export function rutaDe(kind: KindId, targetId: string): string {
  switch (kind) {
    case "doc":
    case "tpl":
      return `/biblioteca/${encodeURIComponent(targetId)}`;
    case "cap":
      return `/capacitaciones/${targetId}`;
    case "tool":
      return `/herramientas/${targetId}`;
    case "faq":
      return `/faq#${targetId}`;
    case "com":
      return `/comunidad/${targetId}`;
  }
}

/**
 * Agrupa el historial por día, como lo muestra la pantalla.
 *
 * "Hoy", "Ayer" y luego la fecha: es como la gente recuerda cuándo vio algo, y
 * ahorra leer una marca de tiempo en cada fila.
 */
export interface GrupoHistorial {
  etiqueta: string;
  items: Visto[];
}

export function agruparPorDia(vistos: Visto[]): GrupoHistorial[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  const grupos = new Map<string, Visto[]>();

  for (const v of vistos) {
    const d = new Date(v.viewedAt);
    d.setHours(0, 0, 0, 0);

    const etiqueta =
      d.getTime() === hoy.getTime()
        ? "Hoy"
        : d.getTime() === ayer.getTime()
          ? "Ayer"
          : d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

    const lista = grupos.get(etiqueta) ?? [];
    lista.push(v);
    grupos.set(etiqueta, lista);
  }

  // El Map conserva el orden de inserción, y los vistos llegan del más reciente
  // al más antiguo, así que los grupos ya salen en el orden correcto.
  return [...grupos.entries()].map(([etiqueta, items]) => ({ etiqueta, items }));
}

/** Cuántos guardados hay de cada tipo, para las pestañas de la pantalla. */
export function contarPorTipo(guardados: Guardado[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const g of guardados) cuenta[g.kind] = (cuenta[g.kind] ?? 0) + 1;
  return cuenta;
}
