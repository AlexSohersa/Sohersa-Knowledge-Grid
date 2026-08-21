import "server-only";

import { PrismaClient } from ".prisma/client-grid";

/**
 * El cliente de la base de SOHERSA.
 *
 * UNA sola base para toda la plataforma: aquí conviven las tablas compartidas
 * —el directorio del equipo, que mantiene Digital Core— y las de esta
 * herramienta. Antes eran dos bases con un espejo de solo lectura entre medias;
 * unificarlas permitió poner llaves foráneas reales donde antes solo había
 * correos sueltos.
 *
 * Se guarda en `globalThis` para que el hot-reload de desarrollo no abra una
 * conexión nueva en cada recarga hasta agotar el pool.
 */
const globalForDb = globalThis as unknown as { sohersaDb?: PrismaClient };

export const dbConfigured = Boolean(process.env.DATABASE_URL);

export function db(): PrismaClient {
  globalForDb.sohersaDb ??= new PrismaClient({ log: ["error"] });
  return globalForDb.sohersaDb;
}

/* ── Alias de transición ──────────────────────────────────────────────────
 * El código llamaba `gridDb()` a la base propia y `portalDb()` al espejo.
 * Ahora son la misma; se conservan los dos nombres para no reescribir cada
 * repositorio, y porque siguen expresando la INTENCIÓN de cada consulta:
 * `portalDb()` marca "esto lee datos que mantiene otra herramienta". */
export const gridDb = db;
export const gridConfigured = dbConfigured;
