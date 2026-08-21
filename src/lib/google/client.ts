import "server-only";

import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { guardarRefresh, leerRefresh } from "@/lib/auth/refresh";

/**
 * Acceso a Google con la cuenta de QUIEN ESTÁ USANDO la plataforma.
 *
 * Mismo enfoque que Deal Engine: se usan los tokens que emitió el inicio de
 * sesión, no una cuenta de servicio. Eso tiene dos consecuencias buenas:
 *
 *   · Funciona para todas las cuentas sin configurar nada por persona.
 *   · Cada quien ve exactamente los archivos a los que ya tiene acceso en
 *     Drive. La plataforma no amplía permisos: los hereda.
 *
 * El Centro pide los MISMOS scopes que el portal —`spreadsheets` y `drive`—,
 * así que quien ya inició sesión en cualquier herramienta de la plataforma no
 * vuelve a ver la pantalla de consentimiento.
 */

/** Error de permisos, para poder distinguirlo y dar un mensaje útil. */
export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

/**
 * Cliente OAuth de la sesión activa.
 *
 * Si el `access_token` caducó, la librería lo renueva sola con el
 * `refresh_token`. El token nuevo vive lo que dure la petición: no se
 * persiste, porque el portal no guarda cuentas en base de datos.
 */
async function clienteDeLaSesion() {
  const session = await auth();
  if (!session?.user) {
    throw new GoogleAuthError("No hay sesión activa.");
  }

  const { googleAccess, googleExpires } = session.user;

  /*
   * El refresh token, del JWT o de la base.
   *
   * Buscarlo también en la base es lo que hace que esto funcione a cualquier
   * hora: una sesión abierta ayer no lo lleva en su JWT —se guardó después—, y
   * sin él la escritura en Sheets moría en cuanto el token de acceso cumplía
   * su hora de vida.
   */
  const guardado = await leerRefresh(session.user.email);
  const googleRefresh = session.user.googleRefresh ?? guardado ?? undefined;

  if (!googleAccess && !googleRefresh) {
    throw new GoogleAuthError(
      "Tu sesión no tiene permisos de Google. Cierra sesión y vuelve a entrar.",
    );
  }

  const scopes = session.user.grantedScopes ?? "";
  if (!scopes.includes("spreadsheets")) {
    throw new GoogleAuthError(
      "Falta el permiso de Google Sheets. Cierra sesión y vuelve a entrar para concederlo.",
    );
  }

  const oauth = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );

  if (googleRefresh) {
    /*
     * Con refresh token se declara la caducidad, y la librería renueva sola
     * cuando hace falta. Esto es lo que sostiene el caso real: alguien que
     * lleva horas con la pestaña abierta y marca su salida.
     */
    oauth.setCredentials({
      access_token: googleAccess,
      refresh_token: googleRefresh,
      expiry_date: googleExpires ? googleExpires * 1000 : undefined,
    });

    // Google puede entregar un refresh token nuevo al renovar. Guardarlo evita
    // seguir usando uno viejo que acabará caducando.
    oauth.on("tokens", (t) => {
      if (t.refresh_token) {
        void guardarRefresh(session.user?.email, t.refresh_token);
      }
    });
  } else {
    /*
     * Sin refresh token no se declara `expiry_date`: la librería intentaría
     * renovar y moriría con "No refresh token is set." aunque el token de
     * acceso siguiera sirviendo. Así al menos funciona su hora de vida, y el
     * siguiente inicio de sesión consigue uno permanente.
     */
    oauth.setCredentials({ access_token: googleAccess });
  }

  return oauth;
}

/** Cliente de Google Sheets para la persona con sesión activa. */
export async function getSheetsClient() {
  return google.sheets({ version: "v4", auth: await clienteDeLaSesion() });
}

/** Cliente de Google Drive para la persona con sesión activa. */
export async function getDriveClient() {
  return google.drive({ version: "v3", auth: await clienteDeLaSesion() });
}

/**
 * El cliente OAuth crudo, para APIs sin envoltorio propio —Gmail, por
 * ejemplo—. Mismo enfoque: los permisos de la sesión, no de una cuenta de
 * servicio.
 */
export async function getOAuth() {
  return clienteDeLaSesion();
}
