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
  matcher: [
    /* Lo que el middleware NO tiene que mirar.
     *
     * Corre antes que nada, en cada petición que pasa el filtro, y es un
     * tercio del tiempo de cómputo de la cuenta. Cada cosa que se excluye
     * aquí es una ejecución que no ocurre.
     *
     * Se añaden a la lista los ficheros estáticos que faltaban —tipografías,
     * iconos, manifiestos, los .txt y .xml que piden los buscadores— y las
     * peticiones internas de Next para prefetch: ninguna necesita saber si
     * hay sesión.
     */
    "/((?!api/auth|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|css|js|map|txt|xml|json)$).*)",
  ],
};
