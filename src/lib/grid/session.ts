import "server-only";

import { cache } from "react";
import { auth } from "@/lib/auth";
import { isEnvAdmin } from "@/lib/auth/access";
import { db, dbConfigured, gridConfigured, gridDb } from "./db";

/**
 * Quién está usando la herramienta.
 *
 * Reúne en un solo objeto lo que casi toda pantalla necesita: el correo (la
 * llave de todo), cómo presentarlo, y si administra. Se resuelve una vez por
 * petición con `cache`, para que diez componentes que lo pidan no disparen diez
 * consultas iguales.
 *
 * El perfil se lee del PADRÓN ÚNICO (`core.persona`): el alta de las personas la
 * mantiene el núcleo y duplicarla aquí crearía otra copia del mismo equipo.
 */
export type CurrentUser = {
  email: string;
  /** Nombre para mostrar. Cae al correo si el portal aún no conoce a la persona. */
  name: string;
  /** Iniciales para el avatar cuando no hay foto. */
  initials: string;
  photo: string | null;
  /** Puesto y área, para la línea bajo el nombre. */
  role: string | null;
  area: string | null;
  /** Administra Sohersa Knowledge Grid. */
  isAdmin: boolean;
};

/** Iniciales a partir del nombre: dos letras como mucho. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "??";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/**
 * Si esta persona administra Sohersa Knowledge Grid.
 *
 * Se consulta en dos lugares y basta con uno:
 *   1. La tabla `GridAdmin`, que es la lista viva y editable.
 *   2. La variable `GRID_ADMINS`, la red de seguridad para el primer arranque:
 *      con la tabla vacía, nadie podría entrar a Administración a dar de alta
 *      al primer administrador.
 *
 * Administrar el PORTAL no da acceso automático aquí: son responsabilidades
 * distintas —publicar capacitaciones y validar respuestas no es lo mismo que
 * gestionar permisos de la plataforma— y mezclarlas haría imposible delegar una
 * sin la otra.
 */
export const esAdmin = cache(async function esAdmin(email: string): Promise<boolean> {
  if (!email) return false;
  if (isEnvAdmin(email)) return true;
  if (!gridConfigured) return false;

  const fila = await gridDb()
    .gridAdmin.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true },
    })
    .catch(() => null);

  return Boolean(fila);
});

/**
 * La persona de la sesión actual, o `null` si no hay sesión.
 *
 * Devuelve `null` en vez de lanzar: hay pantallas —el login— donde no haberla
 * es lo normal. Las que sí la exigen usan `exigirSesion`.
 */
export const usuarioActual = cache(async function usuarioActual(): Promise<CurrentUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  /*
   * El perfil sale del PADRÓN (`core.persona`), no de una copia local.
   *
   * Se busca por `persona_correo` y no por un campo de correo en la persona:
   * el padrón admite varios correos por persona —el corporativo y el personal—
   * y así quien entra con cualquiera de ellos ve su misma ficha.
   */
  const correo = dbConfigured
    ? await db()
        .personaCorreo.findFirst({
          where: { correo: { equals: email, mode: "insensitive" } },
          select: {
            persona: {
              select: { nombre: true, foto: true, puesto: true, area: true },
            },
          },
        })
        .catch(() => null)
    : null;

  const perfil = correo?.persona ?? null;
  const name = perfil?.nombre ?? session.user?.name ?? email;

  return {
    email,
    name,
    initials: iniciales(name),
    // La foto del padrón manda sobre la de la sesión: es la que ve todo el
    // equipo en las demás herramientas, y así el avatar es el mismo en todas.
    photo: perfil?.foto ?? session.user?.image ?? null,
    role: perfil?.puesto ?? null,
    area: perfil?.area ?? null,
    isAdmin: await esAdmin(email),
  };
});

/**
 * La persona de la sesión, dando por hecho que la hay.
 *
 * Para el interior de la aplicación, donde el middleware ya garantizó la
 * sesión. Si aun así faltara, es un error de programación y no un caso a
 * manejar: fallar aquí es preferible a servir una pantalla con datos de nadie.
 */
export async function exigirSesion(): Promise<CurrentUser> {
  const yo = await usuarioActual();
  if (!yo) throw new Error("Se esperaba una sesión activa y no la hay.");
  return yo;
}

/**
 * Las áreas que existen en el padrón.
 *
 * Sirve para que los formularios ofrezcan un desplegable en vez de un campo
 * libre: escrita a mano, «Transformación Digital» acaba de cuatro maneras
 * distintas y la bandeja del área deja de poder agruparse.
 */
export const areasDelPadron = cache(async function areasDelPadron(): Promise<string[]> {
  if (!dbConfigured) return [];

  const filas = await db()
    .persona.findMany({
      where: { area: { not: null }, activo: true },
      select: { area: true },
      distinct: ["area"],
      orderBy: { area: "asc" },
    })
    .catch(() => []);

  return filas.map((f) => f.area!).filter(Boolean);
});
