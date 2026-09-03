import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Scopes que pide Knowledge Grid.
 *
 * Los mismos que el portal, y a propósito. Google concede permisos POR CUENTA,
 * no por aplicación: si esta herramienta pidiera un subconjunto distinto,
 * volvería a aparecer la pantalla de consentimiento al entrar aquí aunque la
 * persona ya la hubiera aceptado en el portal.
 *
 * Se usan para leer con la cuenta de cada quien:
 *   drive / drive.file .... abrir los manuales y materiales que ya puede ver
 *   spreadsheets .......... el cronograma de estandarización
 *   gmail.send ............ avisos de la comunidad (respuesta validada)
 */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send",
] as const;

/**
 * Prefijo de cookie COMPARTIDO — la pieza que hace el inicio de sesión único.
 *
 * Las apps de la plataforma (portal :3000, Deal Engine :3001, Evaluación 360
 * :3003 y este Sohersa Knowledge Grid :3004) usan el prefijo por defecto
 * `authjs.` y el MISMO `AUTH_SECRET`. En localhost las cookies se comparten por
 * dominio —el puerto no cuenta—, así que la sesión que emite una la reconocen
 * las otras y no se vuelve a pedir el selector de cuenta.
 *
 * Requisitos para que funcione:
 *   1. Mismo AUTH_SECRET en todas.
 *   2. Que la sesión resuelva a la persona por CORREO y no por id: las bases
 *      son distintas y los ids no coinciden. Aquí se hace así.
 *
 * En producción hace falta además un dominio común, y eso es lo que aporta
 * `AUTH_COOKIE_DOMAIN`.
 */
const COOKIE_PREFIX = "authjs";
const useSecureCookies = process.env.NODE_ENV === "production";

/**
 * El dominio con el que se emiten las cookies de sesión.
 *
 * Sin esto la cookie vale solo para el host exacto que la puso
 * —`knowledge-grid.sohersabim.com`— y el navegador no se la enseña a las
 * demás herramientas: cada una vuelve a pedir la cuenta. Con
 * `.sohersabim.com` vale para todos los subdominios y la sesión viaja.
 *
 * Vacío en local: ahí las cookies ya se comparten por dominio —el puerto no
 * cuenta— y fijar uno lo rompería.
 */
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

/**
 * `__Host-` PROHÍBE el atributo `domain` —esa es justamente su garantía: la
 * cookie queda atada a un host—. Con dominio compartido baja a `__Secure-`;
 * dejarlo en `__Host-` con un `domain` puesto haría que el navegador la
 * DESCARTE en silencio, y el login daría vueltas sin error visible.
 */
const csrfPrefix = useSecureCookies ? (COOKIE_DOMAIN ? "__Secure-" : "__Host-") : "";

/** Opciones comunes. `domain` solo se pone si hay uno definido. */
const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecureCookies,
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

/**
 * Configuración base, sin acceso a base de datos, para que el middleware pueda
 * correr en el runtime Edge. La configuración completa vive en `./index.ts`.
 */
export const authConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES.join(" "),
          // `offline` + refresh token, para renovar el acceso a Drive y Sheets
          // sin volver a molestar a la persona.
          access_type: "offline",
          /*
           * `consent` es la ÚNICA forma de que Google entregue un
           * `refresh_token`. Sin él, leer Drive solo funciona la hora que dura
           * el token de acceso y después falla con "invalid authentication
           * credentials".
           *
           * La cookie `soh.google-ok` compensa la molestia: en cuanto alguien
           * tiene su token guardado, su siguiente inicio ya no ve esta
           * pantalla. Ver `login/actions.ts`.
           */
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  /*
   * Noventa días, y se renueva cada día que se usa.
   *
   * Tiene que ser el MISMO plazo en las cinco herramientas. Comparten la
   * cookie de sesión, así que la que la considere vencida antes echa a la
   * persona aunque las demás la sigan dando por buena: se cerraba la sesión
   * "de la nada" en unas herramientas y en otras no.
   *
   * El acceso a Google se renueva aparte, en silencio, así que alargar esto
   * no concede nada a nadie: solo evita pedir la cuenta a quien nunca dejó
   * de trabajar aquí.
   */
  session: {
    strategy: "jwt",
    maxAge: 90 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}${COOKIE_PREFIX}.session-token`,
      options: { ...cookieBase },
    },
    callbackUrl: {
      name: `${useSecureCookies ? "__Secure-" : ""}${COOKIE_PREFIX}.callback-url`,
      options: { ...cookieBase, httpOnly: false },
    },
    csrfToken: {
      name: `${csrfPrefix}${COOKIE_PREFIX}.csrf-token`,
      options: { ...cookieBase },
    },
    pkceCodeVerifier: {
      name: `${useSecureCookies ? "__Secure-" : ""}${COOKIE_PREFIX}.pkce.code_verifier`,
      options: { ...cookieBase, maxAge: 900 },
    },
    state: {
      name: `${useSecureCookies ? "__Secure-" : ""}${COOKIE_PREFIX}.state`,
      options: { ...cookieBase, maxAge: 900 },
    },
  },
  callbacks: {
    /**
     * Deny by default: todo exige sesión salvo el propio login. Mismo criterio
     * que el portal, Deal Engine y Evaluación 360.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth");
      return isPublic || !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
