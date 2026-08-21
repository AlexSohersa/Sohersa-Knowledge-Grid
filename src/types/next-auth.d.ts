import type { DefaultSession } from "next-auth";

/**
 * Lo que Knowledge Grid añade a la sesión de NextAuth.
 *
 * Los tokens de Google viajan en el JWT para poder abrir Drive con la cuenta de
 * cada persona desde el servidor. Se declaran opcionales porque una sesión
 * emitida por otra app de la plataforma —el inicio de sesión es único— puede no
 * traerlos todavía.
 */
declare module "next-auth" {
  interface Session {
    user: {
      grantedScopes?: string;
      googleAccess?: string;
      googleRefresh?: string;
      googleExpires?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    grantedScopes?: string;
    googleAccess?: string;
    googleRefresh?: string;
    googleExpires?: number;
  }
}

export {};
