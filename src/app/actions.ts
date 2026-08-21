"use server";

import { signOut } from "@/lib/auth";

/**
 * Cerrar sesión.
 *
 * Vive en el nivel raíz porque la usa el riel, que está en el armazón y no en
 * ninguna sección concreta. Al salir se vuelve al login y no a la portada: sin
 * sesión la portada solo redirigiría otra vez, dando un parpadeo de más.
 */
export async function cerrarSesion() {
  await signOut({ redirectTo: "/login" });
}
