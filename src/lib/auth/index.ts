import NextAuth from "next-auth";
import type { Account, Profile, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import { authConfig } from "./config";
import { isAllowedEmail } from "./access";
import { guardarFoto, guardarRefresh, leerRefresh, olvidarRefresh } from "./refresh";

/**
 * Configuración completa de Knowledge Grid.
 *
 * Sin adaptador de base de datos: la sesión es un JWT y la identidad de la
 * persona ya la mantiene el núcleo en `core.persona`. Lo único que se persiste
 * es el `refresh_token` de Google —en la fila del padrón, para que las cuatro
 * apps compartan el consentimiento y nadie vuelva a ver la pantalla de
 * permisos—.
 *
 * Este archivo puede tocar Prisma; `config.ts` no, porque el middleware lo
 * carga en el runtime Edge.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

        /**
     * A dónde se vuelve después de iniciar sesión.
     *
     * Sin esto, NextAuth usa la dirección de `AUTH_URL`/`NEXTAUTH_URL`, y en
     * Vercel esa variable puede traer la dirección `.vercel.app` del proyecto
     * aunque la persona haya entrado por el subdominio propio. El resultado es
     * que entra bien pero acaba en otra dirección, y ahí su cookie —emitida
     * para `.sohersabim.com`— no vale: la siguiente herramienta le vuelve a
     * pedir la cuenta.
     *
     * `baseUrl` es el sitio desde el que se pidió el inicio de sesión. Se
     * respeta, y así la persona termina donde empezó.
     */
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Una ruta relativa —"/hub"— se cuelga del sitio actual.
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      /* Una dirección absoluta solo se acepta si es del mismo sitio o de un
         subdominio hermano: así el salto entre herramientas sigue funcionando
         y nadie puede usar esto para mandar a la gente fuera. */
      try {
        const destino = new URL(url);
        const propio = new URL(baseUrl);
        const raiz = process.env.AUTH_COOKIE_DOMAIN?.trim();

        if (destino.host === propio.host) return url;
        if (raiz && destino.hostname.endsWith(raiz.replace(/^\./, ""))) return url;
      } catch {
        // Si no es una dirección válida, se cae al caso seguro de abajo.
      }

      return baseUrl;
    },

async signIn({ account, user, profile }) {
      /*
       * El correo sale de `user`, no de `profile`. Es lo que hacen Deal Engine
       * y Evaluación 360, y la razón importa:
       *
       * `profile` es el payload CRUDO que devolvió Google. Que traiga `email`
       * depende de qué reclamaciones incluya el `id_token` en cada caso, y en
       * producción llegó vacío: el inicio de sesión moría con `AccessDenied`
       * aunque la cuenta fuera del dominio correcto. `user` es el objeto que
       * Auth.js ya normalizó a partir del perfil y del endpoint `userinfo`, y
       * ahí el correo siempre está.
       *
       * Tampoco se comprueba `email_verified`: las otras herramientas no lo
       * hacen, y en Workspace la reclamación no siempre viene. Un dominio
       * corporativo ya implica una cuenta verificada por el administrador.
       */
      const rechazar = (motivo: string) => {
        // Auth.js convierte cualquier `false` en el mismo `AccessDenied` sin
        // decir cuál condición falló. Se registra el DOMINIO, nunca el correo
        // completo: basta para diagnosticar sin dejar datos personales.
        console.error(`[login] rechazado: ${motivo}`);
        return false;
      };

      if (account?.provider !== "google")
        return rechazar(`proveedor inesperado (${account?.provider ?? "ninguno"})`);

      const email = user?.email ?? profile?.email;
      if (!email) return rechazar("Google no devolvió correo");

      if (!isAllowedEmail(email)) {
        const dominio = email.toLowerCase().split("@")[1] ?? "(sin dominio)";
        const declarado = process.env.ALLOWED_DOMAIN;
        // Se distingue "no declarada" de "declarada vacía": la segunda parece
        // configurada en el panel y es la que cuesta encontrar.
        const comoLlega =
          declarado === undefined
            ? "(no declarada, se usa el valor por omisión)"
            : declarado.trim() === ""
              ? "(declarada pero VACÍA)"
              : `"${declarado}"`;
        return rechazar(
          `dominio "${dominio}" no autorizado; ALLOWED_DOMAIN=${comoLlega}`,
        );
      }

      return true;
    },

    /*
     * EL CALLBACK, PROTEGIDO POR FUERA.
     *
     * `jwt` corre en CADA petición y ANTES de que la página toque la base. Si
     * algo dentro lanza —Google que tarda, una escritura al padrón que falla—,
     * la petición muere con un 500 y la pantalla no llega a ejecutarse nunca.
     * Es exactamente lo que mostró el registro de producción: 500, tres
     * segundos de ejecución y ninguna petición saliente a la base.
     *
     * Con la sesión ya emitida, seguir con el token que hay es siempre mejor
     * que no servir nada. El envoltorio va aquí, alrededor de la función, para
     * no tocar su interior.
     */
    async jwt(params) {
      try {
        return await jwtInterno(params);
      } catch (e) {
        console.error(
          `[auth] el callback jwt falló: ${e instanceof Error ? e.message : String(e)}`,
        );
        return params.token;
      }
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.grantedScopes = (token.grantedScopes as string) ?? "";
        session.user.image = (token.picture as string | undefined) ?? session.user.image;

        // Los tokens de Google solo se usan en el servidor, para leer Drive con
        // la cuenta de cada quien. Nunca se pintan en la interfaz.
        session.user.googleAccess = token.googleAccess as string | undefined;
        session.user.googleRefresh = token.googleRefresh as string | undefined;
        session.user.googleExpires = token.googleExpires as number | undefined;
      }
      return session;
    },
  },
});

/**
 * Lo que hace `jwt` de verdad.
 *
 * Vive fuera del objeto de configuración para poder envolverlo en un
 * `try/catch` sin reindentar su cuerpo entero.
 */
async function jwtInterno({
  token,
  account,
  profile,
  user,
}: {
  token: JWT;
  account?: Account | null;
  profile?: Profile;
  user?: User | AdapterUser;
}) {
  {
    if (account) {
      // Se guarda lo concedido para poder avisar si falta algún permiso.
      token.grantedScopes = account.scope ?? "";

        /*
         * Foto de perfil: SE PREGUNTA A LA API, no se cree lo que trae el token.
         *
         * `profile.picture` y `user.image` llegan con la URL que Google emitió
         * al crear la sesión, y esas URLs CADUCAN: cuando eso pasa,
         * `lh3.googleusercontent.com` no falla —sirve la silueta genérica de
         * 1.1 KB—, así que guardarla parece correcto y deja a esa persona con un
         * avatar de muñequito. Se midió: 1.1 KB frente a los 8-46 KB de una foto
         * real.
         *
         * Consultar `userinfo` con el access_token recién emitido devuelve la
         * URL viva. Antes esto se hacía SOLO si el token no traía ninguna, que
         * es justo el caso en el que no hacía falta; ahora se hace siempre y lo
         * del token queda como respaldo.
         *
         * El tiempo límite evita que un inicio de sesión se quede colgado
         * esperando a Google por algo tan secundario como un avatar.
         */
        const delToken =
          (profile as { picture?: string } | undefined)?.picture ?? user?.image ?? null;

        let photo: string | null = null;

        if (account.access_token) {
          try {
            const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
              headers: { Authorization: `Bearer ${account.access_token}` },
              signal: AbortSignal.timeout(8000),
            });
            if (res.ok) {
              const info = (await res.json()) as { picture?: string };
              photo = info.picture ?? null;
            }
          } catch {
            // Si Google no responde se usa la del token: una foto quizá vieja es
            // mejor que ninguna.
          }
        }

        photo ??= delToken;

        // Google la entrega a 96px y se ve borrosa en pantallas retina.
        if (photo?.includes("googleusercontent.com")) {
          photo = photo.replace(/=s\d+-c$/, "=s256-c").replace(/=s\d+$/, "=s256");
        }

        token.picture = photo ?? undefined;

        /*
         * La foto, al padrón. En CADA inicio de sesión, no solo el primero: la
         * URL que entrega Google caduca, y guardada una sola vez la ficha se
         * queda mostrando la silueta genérica aunque la persona sí tenga foto.
         */
        if (photo) {
          await guardarFoto(profile?.email ?? user?.email ?? token.email, photo);
        }

        // Tokens de Google: sirven para abrir los manuales de Drive CON LA
        // CUENTA DE CADA PERSONA, de modo que cada quien vea exactamente los
        // archivos a los que ya tiene acceso.
        if (account.access_token) token.googleAccess = account.access_token;
        if (account.expires_at) token.googleExpires = account.expires_at;

        /*
         * El refresh token se guarda en la BASE, no solo en el JWT: el JWT
         * muere al cerrar sesión y Google solo entrega este token cuando
         * muestra la pantalla de permisos. Guardado una vez, esa pantalla se ve
         * una sola vez en la vida.
         */
        /*
         * El correo, por el mismo orden que en `signIn`: `user` primero.
         *
         * `profile` puede llegar sin `email` según lo que Google incluya en el
         * `id_token`. Cuando eso pasa, el token se quedaba sin correo —y el
         * correo es la llave de TODO aquí: el padrón, los guardados, el
         * historial y los permisos se resuelven por él.
         */
        const correo = user?.email ?? profile?.email ?? token.email;

        if (account.refresh_token) {
          token.googleRefresh = account.refresh_token;
          await guardarRefresh(correo, account.refresh_token);
        } else {
          // Google no lo mandó —ya estaba concedido—: se recupera el guardado.
          const guardado = await leerRefresh(correo);
          if (guardado) token.googleRefresh = guardado;
        }

        if (correo) token.email = correo;
      }

      /*
       * Renovar el acceso a Google antes de que caduque.
       *
       * El `access_token` dura una hora; la sesión, semanas. Sin esto, quien
       * lleva rato conectado abre un manual de Drive con un token vencido y ve
       * un error en vez del documento.
       *
       * Se renueva un minuto antes de la hora exacta, para que una petición que
       * empiece justo en el límite no se quede sin margen.
       */
      const caduca = token.googleExpires as number | undefined;
      let refresh = token.googleRefresh as string | undefined;

      // Las sesiones abiertas antes de que esto existiera no llevan refresh
      // token en el JWT; rescatarlo de la base evita obligar a todo el equipo a
      // cerrar sesión el día del despliegue.
      if (!refresh && token.email) {
        refresh = (await leerRefresh(token.email as string)) ?? undefined;
        if (refresh) token.googleRefresh = refresh;
      }

      if (refresh && caduca && Date.now() > (caduca - 60) * 1000) {
        try {
          const r = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            /*
             * CON TIEMPO LÍMITE.
             *
             * Sin él, si Google tarda en contestar la función se queda
             * esperando hasta agotar su tiempo y la petición muere con un 500
             * SIN llegar a consultar la base —que es justo lo que mostró el
             * registro de producción: «sin peticiones salientes», 3 s de
             * ejecución y 500—.
             *
             * Esto corre en CADA página, porque `auth()` renueva el token
             * cuando toca, así que un momento malo de Google tumbaba cualquier
             * pantalla. Cinco segundos: si no contestó, se sigue con el token
             * viejo, que aún sirve hasta caducar de verdad.
             */
            signal: AbortSignal.timeout(5000),
            body: new URLSearchParams({
              client_id: process.env.AUTH_GOOGLE_ID ?? "",
              client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
              grant_type: "refresh_token",
              refresh_token: refresh,
            }),
          });
          if (r.ok) {
            const nuevo = (await r.json()) as {
              access_token?: string;
              expires_in?: number;
              scope?: string;
            };
            if (nuevo.access_token) {
              token.googleAccess = nuevo.access_token;
              token.googleExpires =
                Math.floor(Date.now() / 1000) + (nuevo.expires_in ?? 3600);

              /*
               * Los permisos, al día en cada renovación.
               *
               * `grantedScopes` solo se escribía en el instante del inicio de
               * sesión, así que una sesión abierta desde antes lo traía vacío
               * para siempre —y eso hacía imposible saber qué permisos tiene
               * quien lleva semanas sin cerrar sesión—. Google los devuelve
               * también al renovar, y aprovecharlo los mantiene frescos sin
               * pedirle nada a nadie.
               */
              if (nuevo.scope) token.grantedScopes = nuevo.scope;
            }
          } else if (r.status === 400 || r.status === 401) {
            /*
             * Google rechaza el token: la persona revocó el acceso o caducó por
             * meses sin uso. Reintentar no lo arregla, así que se olvida y el
             * siguiente inicio de sesión consigue uno nuevo.
             */
            token.googleRefresh = undefined;
            await olvidarRefresh(token.email as string);
          }
        } catch {
          // Si la renovación falla se sigue con el token viejo.
        }
      }

    return token;
  }
}
