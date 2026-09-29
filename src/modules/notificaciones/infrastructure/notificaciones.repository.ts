// Módulo NOTIFICACIONES · INFRAESTRUCTURA · Repositorio Prisma.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import {
  claveDe,
  type ClaseAviso,
  type Notificacion,
} from "../domain/notificacion";

/** Cuántos avisos guarda la campana. Más allá, nadie baja a mirarlos. */
const TOPE = 50;

/** Lo que hace falta para crear un aviso. */
export interface NuevoAviso {
  email: string;
  kind: ClaseAviso;
  title: string;
  body?: string | null;
  href?: string | null;
  /** Lo que identifica el HECHO: el id de la respuesta, de la propuesta… */
  ref: string;
}

export const repositorioNotificaciones = {
  /**
   * Crea un aviso, o no hace nada si ese hecho ya se avisó.
   *
   * Se apoya en el índice único `(email, dedupeKey)`: dos intentos del mismo
   * hecho chocan y el segundo se descarta en la base, no en código. Eso lo hace
   * seguro incluso si dos peticiones entran a la vez.
   */
  async crear(aviso: NuevoAviso): Promise<void> {
    if (!gridConfigured) return;

    await gridDb()
      .notificacion.create({
        data: {
          email: aviso.email.toLowerCase(),
          kind: aviso.kind,
          title: aviso.title,
          body: aviso.body ?? null,
          href: aviso.href ?? null,
          dedupeKey: claveDe(aviso.kind, aviso.ref),
        },
      })
      /*
       * Un aviso repetido no es un error: es la señal de que el hecho ya se
       * comunicó. Se traga aquí porque avisar es SIEMPRE secundario respecto a
       * la acción que lo provocó —responder una pregunta debe funcionar aunque
       * el aviso falle—.
       */
      .catch(() => undefined);
  },

  /** Lo mismo para varias personas a la vez: avisar a los administradores. */
  async crearVarios(correos: string[], aviso: Omit<NuevoAviso, "email">): Promise<void> {
    for (const email of new Set(correos.map((c) => c.toLowerCase()))) {
      await this.crear({ ...aviso, email });
    }
  },

  /** Los avisos de una persona, lo más reciente primero. */
  async listar(email: string): Promise<Notificacion[]> {
    if (!gridConfigured) return [];

    /*
     * UN FALLO AQUÍ NO PUEDE TUMBAR LA APLICACIÓN.
     *
     * La campana se pinta en el armazón, así que estas dos consultas corren en
     * CADA página. Sin `catch`, cualquier problema con la base —la conexión se
     * cae un instante, el servidor sin conexión saliente— sube hasta el layout
     * y tira la pantalla entera con un «Application error» que no dice nada.
     * Se comprobó: era esto lo que rompía el historial.
     *
     * Sin avisos se puede trabajar; sin pantalla no. Se devuelve vacío y se
     * registra el motivo.
     */
    const filas = await gridDb()
      .notificacion.findMany({
        where: { email: email.toLowerCase() },
        orderBy: { createdAt: "desc" },
        take: TOPE,
        select: {
          id: true,
          kind: true,
          title: true,
          body: true,
          href: true,
          readAt: true,
          createdAt: true,
        },
      })
      .catch((e: unknown) => {
        console.error(`[avisos] no se pudieron leer: ${e instanceof Error ? e.message : String(e)}`);
        return [];
      });

    /*
     * SE DESCARTAN LOS QUE LLEVAN A UNA PREGUNTA BORRADA.
     *
     * Al borrar una pregunta se retiran sus avisos, pero eso puede no haber
     * ocurrido: una versión anterior de la aplicación, un fallo de la base en
     * ese instante. Y el resultado es feo y difícil de explicar —un aviso que
     * lleva a un «no encontrado» y un contador que cuenta algo invisible—.
     *
     * Filtrarlo AQUÍ hace que la campana sea correcta pase lo que pase antes.
     * Es una consulta más por carga, sobre una lista de cincuenta como mucho, y
     * solo cuando hay avisos de comunidad.
     */
    const deComunidad = filas
      .map((f) => f.href)
      .filter((h): h is string => Boolean(h?.startsWith("/comunidad/")));

    if (deComunidad.length === 0) {
      return filas.map((f) => ({ ...f, kind: f.kind as ClaseAviso }));
    }

    const ids = [...new Set(deComunidad.map((h) => h.slice("/comunidad/".length)))];

    const vivas = await gridDb()
      .question.findMany({ where: { id: { in: ids } }, select: { id: true } })
      .catch(() => null);

    // Si la comprobación falla, se enseñan todos: vale más un aviso de más que
    // una campana vacía por una consulta que no respondió.
    if (!vivas) {
      return filas.map((f) => ({ ...f, kind: f.kind as ClaseAviso }));
    }

    const existen = new Set(vivas.map((q) => q.id));

    return filas
      .filter(
        (f) =>
          !f.href?.startsWith("/comunidad/") ||
          existen.has(f.href.slice("/comunidad/".length)),
      )
      .map((f) => ({ ...f, kind: f.kind as ClaseAviso }));
  },

  /** Cuántos sin leer. Es lo único que necesita el contador de la campana. */
  async sinLeer(email: string): Promise<number> {
    if (!gridConfigured) return 0;

    /*
     * SE CUENTA LO MISMO QUE SE ENSEÑA.
     *
     * Un `count` directo incluiría los avisos que llevan a una pregunta
     * borrada, y `listar` ya los descarta: el número diría «3» y al abrir la
     * campana habría uno. Peor que el número equivocado es que no se pueda
     * bajar a cero —quedaría siempre encendido por algo que nadie ve—.
     *
     * Se reutiliza `listar` en vez de repetir el filtro: así los dos no pueden
     * separarse el día que cambie la regla.
     */
    const avisos = await this.listar(email);
    return avisos.filter((a) => a.readAt === null).length;
  },

  /**
   * Retira los avisos que apuntan a algo que ya no existe.
   *
   * Al borrar una pregunta, sus avisos quedaban en la campana —«Pregunta nueva
   * en la comunidad», «Respondieron a tu pregunta»— llevando a una página que
   * ya no está. Quien pulsaba acababa en un «no encontrado» sin entender por
   * qué, y el contador de sin leer subía por algo que nadie podía ver.
   *
   * Se borran en vez de marcarse leídos: un aviso de algo que dejó de existir
   * no es «viejo», es que nunca debió seguir ahí.
   */
  async olvidarPor(href: string): Promise<void> {
    if (!gridConfigured) return;

    await gridDb()
      .notificacion.deleteMany({ where: { href } })
      /*
       * Un fallo aquí no vale la operación que lo provocó: si la pregunta se
       * borró y esto no, quedan unos avisos huérfanos —molesto— pero borrar la
       * pregunta ya funcionó, que era lo pedido.
       */
      .catch((e: unknown) => {
        console.error(
          `[avisos] no se pudieron retirar los de ${href}: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
  },

  /** Marca como leídos todos los de una persona. */
  async marcarLeidos(email: string): Promise<void> {
    if (!gridConfigured) return;

    await gridDb().notificacion.updateMany({
      where: { email: email.toLowerCase(), readAt: null },
      data: { readAt: new Date() },
    });
  },

  /** Marca uno solo, al pulsarlo. */
  async marcarLeido(id: string, email: string): Promise<void> {
    if (!gridConfigured) return;

    await gridDb().notificacion.updateMany({
      // El correo va en el `where` para que nadie marque los avisos de otro
      // pasando un id ajeno.
      where: { id, email: email.toLowerCase(), readAt: null },
      data: { readAt: new Date() },
    });
  },
};
