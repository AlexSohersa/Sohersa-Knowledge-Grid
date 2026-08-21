import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/grid/session";

/**
 * Puerta de Administración.
 *
 * Se comprueba en el LAYOUT y no en cada página: así ninguna pantalla de esta
 * carpeta puede olvidarse de hacerlo, y no hace falta repetir la misma
 * comprobación en seis sitios. Las acciones vuelven a comprobarlo por su
 * cuenta, porque una ruta protegida no protege una acción invocada a mano.
 *
 * Se manda a Inicio en vez de mostrar un "no tienes permiso": quien llega aquí
 * sin permisos normalmente escribió la dirección por curiosidad, y una pantalla
 * de error no le aporta nada.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const yo = await usuarioActual();
  if (!yo) redirect("/login");
  if (!yo.isAdmin) redirect("/");

  return <>{children}</>;
}
