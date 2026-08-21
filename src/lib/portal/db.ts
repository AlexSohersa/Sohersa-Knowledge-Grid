import "server-only";

/**
 * Acceso a las tablas COMPARTIDAS de la plataforma.
 *
 * Ya no hay dos bases: `TeamMember` vive en la misma que todo lo demás. Este
 * módulo se conserva porque su nombre documenta la intención —"esto lee el
 * directorio del equipo, que mantiene Digital Core"— y porque evita reescribir
 * los repositorios que ya lo usaban.
 *
 * Regla que sigue vigente: NO se escribe en `TeamMember` desde aquí, salvo el
 * `googleRefresh` al iniciar sesión.
 */
export { db as portalDb, dbConfigured as portalConfigured } from "@/lib/grid/db";
