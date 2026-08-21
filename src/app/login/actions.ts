"use server";

import { cookies } from "next/headers";

import { signIn } from "@/lib/auth";

/**
 * Marca de "esta persona ya concedió los permisos".
 *
 * El login no sabe quién eres antes de entrar, así que no puede consultar la
 * base para decidir si hace falta la pantalla de consentimiento. Esta cookie
 * lo recuerda en el navegador: se pone cuando el `refresh_token` queda
 * guardado, y dura un año.
 *
 * Si se pierde —otro equipo, navegador limpio—, lo único que pasa es que se ve
 * la pantalla de permisos una vez más. Nada se rompe.
 *
 * No se exporta: en un archivo `"use server"` solo pueden exportarse funciones
 * async. `refresh.ts` declara la suya con el mismo valor.
 */
const COOKIE_CONSENTIMIENTO = "soh.google-ok";

/**
 * Entrada normal.
 *
 * Sin la marca se pide consentimiento, porque es la única forma de que Google
 * entregue un `refresh_token`; con ella basta el selector de cuenta.
 */
export async function signInWithGoogle() {
  const yaConsintio = (await cookies()).get(COOKIE_CONSENTIMIENTO)?.value === "1";
  await signIn(
    "google",
    { redirectTo: "/" },
    { prompt: yaConsintio ? "select_account" : "consent" },
  );
}

/**
 * Fuerza la pantalla de consentimiento.
 *
 * Sirve cuando alguien concedió los permisos a medias, cuando se agrega un
 * scope nuevo, o cuando Google revocó el token guardado.
 */
export async function reconnectGoogle() {
  await signIn("google", { redirectTo: "/" }, { prompt: "consent" });
}
