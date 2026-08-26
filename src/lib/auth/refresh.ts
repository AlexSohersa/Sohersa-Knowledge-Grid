import "server-only";

import { cookies } from "next/headers";

import { db, dbConfigured } from "@/lib/grid/db";

/** La misma marca que lee el login para decidir si pedir consentimiento. */
const COOKIE_CONSENTIMIENTO = "soh.google-ok";

/**
 * Deja o quita la marca de "ya concedió los permisos".
 *
 * El callback del JWT corre durante la respuesta del login, así que todavía
 * puede escribir cookies. Si no pudiera —según el momento del ciclo, Next lo
 * impide—, no pasa nada: lo peor es ver la pantalla de permisos otra vez.
 */
async function marcar(valor: boolean) {
  try {
    const c = await cookies();
    if (valor) {
      c.set(COOKIE_CONSENTIMIENTO, "1", {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    } else {
      c.delete(COOKIE_CONSENTIMIENTO);
    }
  } catch {
    // Fuera de un contexto que permita escribir cookies. Sin consecuencias.
  }
}

/**
 * El `refresh_token` de Google, guardado por persona.
 *
 * Google lo entrega ÚNICAMENTE cuando muestra la pantalla de permisos, y la
 * salta si la cuenta ya concedió esos scopes —a esta app o a otra—. Si solo
 * viviera en el JWT, se perdería al cerrar sesión y habría que volver a pedir
 * consentimiento en cada inicio, que es justo lo molesto.
 *
 * Guardándolo una vez, esa pantalla se ve una sola vez en la vida: los inicios
 * siguientes recuperan el token de aquí.
 *
 * Vive en su propio módulo porque `config.ts` tiene que poder correr en el
 * runtime Edge del middleware, y Prisma no corre ahí.
 *
 * Se guarda en el PADRÓN (`core.persona.google_refresco`) y no en cada
 * herramienta: el token es el mismo para las cuatro aplicaciones, y con una
 * copia por app bastaría con que alguien revocara el acceso para dejar tres
 * copias caducadas sin que nadie se entere.
 *
 * La búsqueda es por `persona_correo` y no por un campo de correo directo:
 * el padrón admite varios correos por persona —el corporativo y el personal—,
 * así que quien entra con cualquiera de ellos actualiza su misma ficha.
 */

/** El `where` que encuentra a una persona por cualquiera de sus correos. */
function porCorreo(email: string) {
  return { correos: { some: { correo: email.toLowerCase() } } };
}

/** Guarda el token. No pisa uno bueno con un vacío. */
export async function guardarRefresh(
  email: string | null | undefined,
  token: string | null | undefined,
): Promise<void> {
  if (!email || !token || !dbConfigured) return;
  try {
    await db().persona.updateMany({
      where: porCorreo(email),
      data: { google_refresco: token },
    });
    // Ya no hace falta volver a pedirle permisos a esta persona.
    await marcar(true);
  } catch {
    // Sin esto se sigue pudiendo trabajar: lo que se pierde es poder escribir
    // en Sheets cuando el token de acceso caduque.
  }
}

/** El token guardado, si lo hay. */
export async function leerRefresh(
  email: string | null | undefined,
): Promise<string | null> {
  if (!email || !dbConfigured) return null;
  try {
    const p = await db().persona.findFirst({
      where: porCorreo(email),
      select: { google_refresco: true },
    });
    return p?.google_refresco ?? null;
  } catch {
    return null;
  }
}

/**
 * Borra el token cuando Google lo rechaza.
 *
 * Un token revocado —porque la persona quitó el acceso desde su cuenta— no
 * sirve y no se recupera reintentando. Borrarlo hace que el siguiente inicio
 * de sesión vuelva a pedir consentimiento y consiga uno nuevo.
 */
export async function olvidarRefresh(
  email: string | null | undefined,
): Promise<void> {
  if (!email || !dbConfigured) return;
  try {
    await db().persona.updateMany({
      where: porCorreo(email),
      data: { google_refresco: null },
    });
    // Sin token guardado hay que volver a pedir permisos en el próximo inicio.
    await marcar(false);
  } catch {
    // Nada que hacer.
  }
}

/**
 * Guarda la foto de perfil en el padrón, en cada inicio de sesión.
 *
 * POR QUÉ EN CADA INICIO Y NO SOLO LA PRIMERA VEZ. Google entrega la foto como
 * una URL con un identificador que CADUCA: cuando alguien cambia su foto —o
 * pasa el tiempo suficiente—, la URL vieja deja de servir la imagen y empieza a
 * devolver la silueta genérica de 1.1 KB. Guardada una sola vez, la ficha de esa
 * persona se queda con un avatar roto para siempre, y desde fuera parece que no
 * tiene foto puesta cuando sí la tiene.
 *
 * Se comprobó con dos personas del equipo: su URL en el padrón y la que guarda
 * Evaluación 360 eran DISTINTAS y las dos devolvían la silueta, mientras que
 * quien había entrado más recientemente sí mostraba su foto real. Refrescar en
 * cada entrada es lo que mantiene la URL viva.
 *
 * No pisa una foto buena con una vacía: si Google no la manda esta vez, se
 * conserva la que hubiera.
 */
export async function guardarFoto(
  email: string | null | undefined,
  foto: string | null | undefined,
): Promise<void> {
  if (!email || !foto || !dbConfigured) return;

  try {
    await db().persona.updateMany({
      where: porCorreo(email),
      data: { foto },
    });
  } catch {
    // La foto es lo menos importante de un inicio de sesión: si falla, se entra
    // igual y se muestran las iniciales.
  }
}
