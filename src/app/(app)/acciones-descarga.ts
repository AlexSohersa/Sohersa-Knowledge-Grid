"use server";

import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/grid/session";
import { gridConfigured, gridDb } from "@/lib/grid/db";

/**
 * Cuenta una descarga y lleva al archivo.
 *
 * Va por el servidor en vez de ser un enlace suelto por una razón concreta: con
 * un `<a href>` nadie se entera de que alguien descargó. Y las descargas son la
 * única señal de qué se usa de verdad —una herramienta con doscientas dice algo
 * que ninguna otra cosa de la ficha dice—.
 *
 * EL DESTINO SE LEE DE LA BASE, NO DEL FORMULARIO. El formulario lo trae por
 * comodidad, pero un campo oculto lo puede cambiar cualquiera desde el
 * navegador, y entonces esto sería un redirector abierto: un enlace de nuestro
 * dominio que lleva a donde quiera quien fabrique la petición. Se busca el id
 * en la base y se usa lo que esté guardado ahí.
 */
export async function registrarDescarga(form: FormData): Promise<void> {
  await exigirSesion();

  const id = String(form.get("id") ?? "").trim();
  if (!id || !gridConfigured) redirect("/herramientas");

  const h = await gridDb()
    .tool.findUnique({
      where: { id },
      select: { downloadUrl: true, driveFileId: true },
    })
    .catch(() => null);

  if (!h) redirect("/herramientas");

  const destino = h.driveFileId
    ? `https://drive.google.com/uc?export=download&id=${h.driveFileId}&confirm=t`
    : h.downloadUrl?.trim();

  if (!destino) redirect(`/herramientas/${id}`);

  /*
   * El contador no vale la descarga.
   *
   * Si la base falla, lo que importa —que la persona reciba su archivo— tiene
   * que pasar igual. Por eso se traga el error en vez de dejarlo subir.
   */
  await gridDb()
    .tool.update({ where: { id }, data: { downloads: { increment: 1 } } })
    .catch(() => undefined);

  redirect(destino);
}
