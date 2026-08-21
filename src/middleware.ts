import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Puerta de entrada: sin sesión, al login.
 *
 * Usa la configuración SIN base de datos a propósito: el middleware corre en el
 * runtime Edge, donde Prisma no existe. La decisión de quién pasa vive en el
 * callback `authorized` de `authConfig`.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  /*
   * Se excluyen los archivos estáticos y las rutas de NextAuth. Sin esto, cada
   * imagen y cada fuente pasaría por la comprobación de sesión, que es trabajo
   * inútil y hace más lenta la carga.
   */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
