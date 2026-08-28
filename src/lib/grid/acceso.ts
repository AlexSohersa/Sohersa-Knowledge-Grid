import "server-only";

import { db } from "@/lib/grid/db";

/**
 * ¿Le dieron acceso a esta herramienta desde el Digital Core?
 *
 * El reparto de herramientas se hace en un solo sitio —la pantalla de
 * Permisos del portal— y se guarda en `public."TeamMember".hiddenApps`. Ahí
 * se apunta lo que se QUITA, no lo que se da: así una herramienta nueva la ve
 * todo el mundo desde el primer día, y quien nunca se ha tocado tiene la
 * lista vacía, que significa «ve todo».
 *
 * Esta herramienta lo consulta en vez de decidirlo por su cuenta. Tener
 * cuenta aquí no basta: si en el portal le quitaron el Grid, no entra, aunque
 * su correo esté en el padrón y tenga una ruta de aprendizaje empezada.
 *
 * Se consulta con SQL suelto y no con un modelo de Prisma a propósito:
 * `TeamMember` es del portal, y declararla aquí crearía dos dueños para la
 * misma tabla cuando lo único que hace falta es leer un dato.
 */
const ID_HERRAMIENTA = "knowledge-grid";

/**
 * `true` si esa persona puede entrar.
 *
 * Ante la duda, deja pasar: si la consulta falla —la base no responde, la
 * tabla no está— la herramienta sigue funcionando. Un permiso reparte el
 * trabajo; la barrera de seguridad es el inicio de sesión, que va antes.
 * Cerrar el paso porque una consulta auxiliar falló dejaría a todo el mundo
 * fuera por un problema que no tiene que ver con ellos.
 */
export async function tieneAcceso(correo: string): Promise<boolean> {
  try {
    const filas = await db().$queryRaw<{ hiddenApps: string[] }[]>`
      select "hiddenApps" from public."TeamMember" where email = ${correo} limit 1
    `;
    const ocultas = filas[0]?.hiddenApps ?? [];
    return !ocultas.includes(ID_HERRAMIENTA);
  } catch {
    return true;
  }
}

/** La dirección del portal, para devolver ahí a quien no tiene acceso. */
export function urlDelPortal(): string {
  return process.env.NEXT_PUBLIC_URL_DIGITAL_CORE ?? "https://digital-core.sohersabim.com";
}
