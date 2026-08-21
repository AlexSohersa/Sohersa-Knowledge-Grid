// De dónde venía quien está mirando una ficha, para saber a dónde devolverlo.

/**
 * El problema que resuelve este módulo.
 *
 * Un documento, una capacitación o una herramienta se alcanzan desde varios
 * sitios: su propia sección, la ruta de formación, el buscador, la FAQ... Si el
 * botón de volver apunta siempre al mismo lado, quien entró desde su ruta
 * termina en la biblioteca, con la etapa que estaba recorriendo perdida.
 *
 * La solución es que el ENLACE DE IDA declare de dónde sale, en el parámetro
 * `?de=`, y que la ficha lo lea para construir el regreso. Se eligió esto sobre
 * las dos alternativas obvias:
 *
 *  · `history.back()` devuelve a la página anterior sea cual sea —incluido el
 *    login, o una recarga—, y no puede decir a dónde va, así que el botón
 *    tendría que llamarse "Atrás" en vez de nombrar el destino.
 *  · El `Referer` no sobrevive a compartir el enlace ni a recargar, y no está
 *    disponible al renderizar en el cliente.
 *
 * Un parámetro en la URL, en cambio, se conserva al recargar y al compartir, y
 * deja que el botón diga exactamente a dónde lleva.
 */

/** Los orígenes desde los que se llega a una ficha. */
export type Procedencia = "ruta" | "biblioteca" | "capacitaciones" | "herramientas" | "faq" | "buscar" | "guardados" | "historial";

/** El regreso: a dónde volver y cómo llamar a ese sitio en el botón. */
export type Regreso = { href: string; etiqueta: string };

/*
 * Cada origen, con su destino y su nombre.
 *
 * `ruta` es el único que necesita más que una constante: hay varias rutas por
 * persona y hay que volver a la que se estaba viendo, así que lleva el id.
 */
const ORIGENES: Record<Procedencia, Regreso> = {
  ruta: { href: "/ruta", etiqueta: "Mi ruta" },
  biblioteca: { href: "/biblioteca", etiqueta: "Biblioteca" },
  capacitaciones: { href: "/capacitaciones", etiqueta: "Capacitaciones" },
  herramientas: { href: "/herramientas", etiqueta: "Herramientas" },
  faq: { href: "/faq", etiqueta: "Preguntas frecuentes" },
  buscar: { href: "/buscar", etiqueta: "Resultados de búsqueda" },
  guardados: { href: "/guardados", etiqueta: "Guardados" },
  historial: { href: "/historial", etiqueta: "Historial" },
};

/** ¿Es `valor` uno de los orígenes que conocemos? */
export function esProcedencia(valor: unknown): valor is Procedencia {
  return typeof valor === "string" && valor in ORIGENES;
}

/**
 * El regreso que corresponde a un `?de=`, con el destino por omisión de la
 * sección cuando no viene, no se reconoce o llega manipulado.
 *
 * `ref` es el dato extra que necesita el origen: para `ruta`, el id de la ruta,
 * de modo que se vuelva a la que se estaba recorriendo y no a la primera. Se
 * ignora en los demás.
 *
 * El destino por omisión NO se adivina: lo pasa la ficha que llama, porque solo
 * ella sabe cuál es su propia sección.
 */
export function regresoDe(
  de: string | undefined,
  porOmision: Regreso,
  ref?: string,
): Regreso {
  if (!esProcedencia(de)) return porOmision;

  const base = ORIGENES[de];

  /*
   * La ruta vuelve a la ETAPA, no solo a la pantalla.
   *
   * `?r=` elige cuál de las rutas asignadas se mira y `#etapa-…` baja hasta
   * donde estaba, que es lo que se pierde hoy: volver arriba de una ruta larga
   * obliga a buscar otra vez por dónde se iba.
   */
  if (de === "ruta" && ref) {
    const [rutaId, etapaId] = ref.split(":");
    const query = rutaId ? `?r=${encodeURIComponent(rutaId)}` : "";
    const ancla = etapaId ? `#etapa-${encodeURIComponent(etapaId)}` : "";
    return { href: `${base.href}${query}${ancla}`, etiqueta: base.etiqueta };
  }

  /*
   * La búsqueda vuelve a SUS resultados.
   *
   * Devolver al buscador vacío obliga a teclear otra vez lo mismo, así que
   * `ref` trae la consulta y el filtro para reconstruirla tal como estaba.
   */
  if (de === "buscar" && ref) {
    return { href: `${base.href}?q=${encodeURIComponent(ref)}`, etiqueta: base.etiqueta };
  }

  return base;
}

/**
 * El `?de=…` (y `?ref=…`) que hay que colgar de un enlace de ida.
 *
 * Vive aquí para que el origen se escriba una vez y no como literal repetido en
 * cada tarjeta, que es como se desincronizan estas cosas.
 */
export function marcarOrigen(destino: string, de: Procedencia, ref?: string): string {
  const sep = destino.includes("?") ? "&" : "?";
  const cola = ref ? `&ref=${encodeURIComponent(ref)}` : "";
  return `${destino}${sep}de=${de}${cola}`;
}
