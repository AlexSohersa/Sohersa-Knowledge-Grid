// Módulo PERSONAS · INFRAESTRUCTURA · Composición (wiring).

import "server-only";

import { db, dbConfigured, gridConfigured, gridDb } from "@/lib/grid/db";
import { isEnvAdmin } from "@/lib/auth/access";
import type { Colaborador, Seccion } from "../domain/permisos";

/**
 * El equipo, con lo que puede hacer cada quien.
 *
 * Las personas salen del PADRÓN (`core.persona`) y los permisos de `GridAdmin`.
 * No se guarda aquí ninguna copia del equipo: darlo de alta es del núcleo, y
 * una tabla propia de personas sería la cuarta copia del mismo padrón —justo lo
 * que la unificación vino a resolver—.
 */
export async function listarColaboradores(): Promise<Colaborador[]> {
  if (!dbConfigured) return [];

  const personas = await db()
    .persona.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        puesto: true,
        area: true,
        foto: true,
        activo: true,
        correos: { select: { correo: true, principal: true } },
      },
      orderBy: { nombre: "asc" },
    })
    .catch(() => []);

  const permisos = gridConfigured
    ? await gridDb()
        .gridAdmin.findMany({
          select: { email: true, esAdmin: true, revisaFaq: true, secciones: true },
        })
        .catch(() => [])
    : [];

  /* Por correo en minúsculas: es la llave con la que se cruzan las dos tablas. */
  const porCorreo = new Map(permisos.map((p) => [p.email.toLowerCase(), p]));

  return personas.map((p) => {
    /*
     * El correo que se muestra es el PRINCIPAL —el corporativo—, pero los
     * permisos se buscan por CUALQUIERA de sus correos: alguien puede haber
     * entrado con su Gmail el día que se le dio permiso, y castigarle por eso
     * dejaría su fila diciendo que no administra cuando sí lo hace.
     */
    const principal = p.correos.find((c) => c.principal) ?? p.correos[0];
    const correo = principal?.correo ?? "";

    const fila = p.correos
      .map((c) => porCorreo.get(c.correo.toLowerCase()))
      .find(Boolean);

    // `GRID_ADMINS` es la red de seguridad del primer arranque: quien esté ahí
    // administra aunque la tabla esté vacía.
    const porEntorno = p.correos.some((c) => isEnvAdmin(c.correo));

    return {
      personaId: p.id,
      nombre: p.nombre,
      correo,
      puesto: p.puesto,
      area: p.area,
      foto: p.foto,
      activo: p.activo,
      permisos: {
        esAdmin: porEntorno || Boolean(fila?.esAdmin),
        revisaFaq: porEntorno || Boolean(fila?.revisaFaq),
        secciones: (fila?.secciones ?? []) as Seccion[],
      },
    };
  });
}

/**
 * Guarda los permisos de una persona.
 *
 * Si se queda sin ninguno, la fila se BORRA en vez de quedarse con todo en
 * falso: así la tabla lista exactamente a quien tiene algo concedido, y mirarla
 * responde la pregunta «¿quién puede hacer algo aquí?» sin filtrar.
 */
export async function guardarPermisos(
  correo: string,
  permisos: { esAdmin: boolean; revisaFaq: boolean; secciones: string[] },
  concedidoPor: string,
): Promise<void> {
  const email = correo.toLowerCase();
  const sinNada =
    !permisos.esAdmin && !permisos.revisaFaq && permisos.secciones.length === 0;

  if (sinNada) {
    await gridDb().gridAdmin.deleteMany({ where: { email } });
    return;
  }

  await gridDb().gridAdmin.upsert({
    where: { email },
    create: {
      email,
      esAdmin: permisos.esAdmin,
      revisaFaq: permisos.revisaFaq,
      secciones: permisos.secciones,
      grantedBy: concedidoPor,
    },
    update: {
      esAdmin: permisos.esAdmin,
      revisaFaq: permisos.revisaFaq,
      secciones: permisos.secciones,
    },
  });
}

/** Si esta persona puede revisar el FAQ. */
export async function revisaFaq(email: string): Promise<boolean> {
  if (isEnvAdmin(email)) return true;
  if (!gridConfigured) return false;

  const fila = await gridDb()
    .gridAdmin.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { esAdmin: true, revisaFaq: true },
    })
    .catch(() => null);

  return Boolean(fila?.revisaFaq || fila?.esAdmin);
}
