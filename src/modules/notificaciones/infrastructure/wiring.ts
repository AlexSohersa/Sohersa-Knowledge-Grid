// Módulo NOTIFICACIONES · INFRAESTRUCTURA · Composición (wiring).
//
// Es lo único que la interfaz importa de este módulo.

import "server-only";

import { repositorioNotificaciones, type NuevoAviso } from "./notificaciones.repository";
import { gridConfigured, gridDb } from "@/lib/grid/db";
import { isEnvAdmin } from "@/lib/auth/access";

export function misAvisosWired(email: string) {
  return repositorioNotificaciones.listar(email);
}

export function sinLeerWired(email: string) {
  return repositorioNotificaciones.sinLeer(email);
}

export function marcarLeidosWired(email: string) {
  return repositorioNotificaciones.marcarLeidos(email);
}

export function marcarLeidoWired(id: string, email: string) {
  return repositorioNotificaciones.marcarLeido(id, email);
}

export function avisarWired(aviso: NuevoAviso) {
  return repositorioNotificaciones.crear(aviso);
}

/**
 * Avisa a todos los administradores.
 *
 * Se juntan las dos fuentes de administrador que reconoce la aplicación: la
 * tabla `GridAdmin`, que es la lista viva, y la variable `GRID_ADMINS`, que es
 * la red de seguridad del primer arranque. Mirar solo la tabla dejaría sin
 * avisos el día del despliegue, que es justo cuando llegan las primeras
 * propuestas.
 */
export async function avisarAdminsWired(aviso: Omit<NuevoAviso, "email">): Promise<void> {
  const correos = new Set<string>();

  for (const c of (process.env.GRID_ADMINS ?? "").split(",")) {
    const v = c.trim().toLowerCase();
    if (v) correos.add(v);
  }

  if (gridConfigured) {
    const filas = await gridDb()
      .gridAdmin.findMany({ select: { email: true } })
      .catch(() => []);
    for (const f of filas) correos.add(f.email.toLowerCase());
  }

  if (correos.size === 0) return;
  await repositorioNotificaciones.crearVarios([...correos], aviso);
}

/** Si un correo administra, sin consultar la sesión. Para avisos dirigidos. */
export async function esAdminWired(email: string): Promise<boolean> {
  if (isEnvAdmin(email)) return true;
  if (!gridConfigured) return false;

  const fila = await gridDb()
    .gridAdmin.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true },
    })
    .catch(() => null);

  return Boolean(fila);
}
