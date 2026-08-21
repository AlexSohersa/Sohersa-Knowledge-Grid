import NextAuth from "next-auth";
import { authConfig } from "./config";
import { isAllowedEmail } from "./access";
import { guardarRefresh, leerRefresh, olvidarRefresh } from "./refresh";

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
        return rechazar(
          `dominio "${dominio}" no autorizado; ALLOWED_DOMAIN=${process.env.ALLOWED_DOMAIN ?? "(sin definir)"}`,
        );
      }

      return true;
    },

    async jwt({ token, account, profile, user }) {
      if (account) {
        // Se guarda lo concedido para poder avisar si falta algún permiso.
        token.grantedScopes = account.scope ?? "";

        /*
         * Foto de perfil.
         *
         * El `id_token` casi nunca trae `picture` en cuentas de Workspace. La
         * foto sí está en el endpoint OpenID `userinfo`, que se consulta con el
         * access_token recién emitido; no hace falta ningún scope nuevo porque
         * `profile` ya lo cubre. Sin esto el avatar cae siempre a las iniciales.
         */
        let photo =
          (profile as { picture?: string } | undefined)?.picture ?? user?.image ?? null;

        if (!photo && account.access_token) {
          try {
            const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
              headers: { Authorization: `Bearer ${account.access_token}` },
            });
            if (res.ok) {
              const info = (await res.json()) as { picture?: string };
              if (info.picture) photo = info.picture;
            }
          } catch {
            // Si falla, se siguen mostrando las iniciales.
          }
        }

        // Google la entrega a 96px y se ve borrosa en pantallas retina.
        if (photo?.includes("googleusercontent.com")) {
          photo = photo.replace(/=s\d+-c$/, "=s256-c").replace(/=s\d+$/, "=s256");
        }

        token.picture = photo ?? undefined;

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
            };
            if (nuevo.access_token) {
              token.googleAccess = nuevo.access_token;
              token.googleExpires =
                Math.floor(Date.now() / 1000) + (nuevo.expires_in ?? 3600);
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
