// Módulo NOTIFICACIONES · DOMINIO · Los avisos dirigidos a una persona.
//
// Un aviso es de algo que pasó mientras esa persona NO estaba mirando: que
// respondieron su pregunta, que hay una propuesta esperando revisión. Por eso
// se guarda en la base y no se calcula sobre lo que hay en pantalla, y por eso
// lo leído tampoco vive en el navegador: se perdería al cambiar de equipo.

/** De qué avisa. Cada clase tiene su icono y su color en la campana. */
export type ClaseAviso =
  /** Alguien propuso una ficha y espera revisión. Va a los administradores. */
  | "FAQ_PROPUESTA"
  /** Resolvieron tu propuesta: se aprobó o se rechazó. Va a quien la mandó. */
  | "FAQ_RESUELTA"
  /** Hay una pregunta nueva en la comunidad. */
  | "PREGUNTA_NUEVA"
  /** Respondieron a una pregunta tuya. */
  | "RESPUESTA_A_TU_PREGUNTA"
  /** Llegó un comentario para Estandarización y Calidad. */
  | "COMENTARIO_NUEVO";

export interface Notificacion {
  id: string;
  kind: ClaseAviso;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/** El aspecto de cada clase de aviso: icono y color del punto. */
const ASPECTO: Record<ClaseAviso, { icono: string; color: string }> = {
  FAQ_PROPUESTA: { icono: "faq", color: "var(--kc-amber)" },
  FAQ_RESUELTA: { icono: "check", color: "var(--kc-green-solid)" },
  PREGUNTA_NUEVA: { icono: "community", color: "var(--kc-violet)" },
  RESPUESTA_A_TU_PREGUNTA: { icono: "community", color: "var(--kc-teal)" },
  COMENTARIO_NUEVO: { icono: "faq", color: "var(--kc-amber)" },
};

export function aspectoDe(kind: ClaseAviso) {
  return ASPECTO[kind] ?? { icono: "faq", color: "var(--kc-ink-4)" };
}

/**
 * La clave que evita duplicados —y que permite REVIVIR un aviso.
 *
 * Idea tomada de la campana de Deal Engine, donde la clave de una alerta
 * incluye la fecha del toque: si mueven la fecha, vuelve a avisar. Aquí el
 * mismo principio, aplicado al hecho concreto:
 *
 *   · Dos respuestas a la misma pregunta son DOS avisos, porque `ref` lleva el
 *     id de la respuesta.
 *   · El mismo hecho registrado dos veces —un doble clic, un reintento— es UNO
 *     solo, porque la clave sale igual y la base la rechaza.
 */
export function claveDe(kind: ClaseAviso, ref: string): string {
  return `${kind}:${ref}`;
}

/** Cuántos avisos sin leer. Es el número del contador de la campana. */
export function sinLeer(avisos: Notificacion[]): number {
  return avisos.filter((a) => a.readAt === null).length;
}

/**
 * «hace 5 min», «ayer», «el 12 de marzo».
 *
 * En una campana el tiempo relativo se lee mejor que una fecha: lo que importa
 * es si es de hace un momento o de la semana pasada, no el día exacto.
 */
export function haceCuanto(fecha: Date, ahora: Date = new Date()): string {
  const seg = Math.max(0, Math.floor((ahora.getTime() - fecha.getTime()) / 1000));

  if (seg < 60) return "hace un momento";
  if (seg < 3600) {
    const m = Math.floor(seg / 60);
    return `hace ${m} ${m === 1 ? "minuto" : "minutos"}`;
  }
  if (seg < 86400) {
    const h = Math.floor(seg / 3600);
    return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  if (seg < 172800) return "ayer";
  if (seg < 604800) return `hace ${Math.floor(seg / 86400)} días`;

  /*
   * Con zona fija, como todo lo que se muestra.
   *
   * La campana se pinta en CADA página, así que un desajuste aquí entre lo que
   * escribe el servidor y lo que calcula el navegador rompería la hidratación
   * en toda la aplicación, no solo en una pantalla.
   */
  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });
}
