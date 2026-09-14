"use server";

import { revalidatePath } from "next/cache";
import { avisarWired } from "@/modules/notificaciones/infrastructure/wiring";
import { ordenarCapturas } from "@/modules/faq/infrastructure/ordenar-capturas";
import { guardarPermisos } from "@/modules/personas/infrastructure/wiring";
import { generarCodigoWired as generarCodigo } from "@/modules/faq/infrastructure/wiring";
import { reubicarCaptura } from "@/modules/faq/infrastructure/subir-captura";
import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/grid/session";
import {
  agregarMaterialWired,
  agregarTemaWired,
  archivarCapacitacionWired,
  crearCapacitacionWired,
  editarCapacitacionWired,
  editarTemaWired,
  eliminarCapacitacionWired,
  eliminarMaterialWired,
  eliminarTemaWired,
  publicarCapacitacionWired,
  verCapacitacionWired,
} from "@/modules/capacitaciones/infrastructure/wiring";
import { siguienteCodigo } from "@/modules/capacitaciones/infrastructure/codigos";
import {
  copiarArchivo,
  idDesdeEnlace,
  prepararCarpeta,
  subirArchivo,
} from "@/modules/capacitaciones/infrastructure/carpeta-drive";
import {
  agregarEtapaWired,
  agregarItemWired,
  asignarRutaWired,
  crearRutaWired,
  desasignarRutaWired,
  eliminarEtapaWired,
  eliminarItemWired,
  eliminarRutaWired,
} from "@/modules/rutas/infrastructure/wiring";
import {
  crearFaqWired,
  editarFaqWired,
  eliminarFaqWired,
  verPropuestaWired,
  resolverPropuestaWired,
  aceptarComentarioWired,
  rechazarComentarioWired,
  verComentarioWired,
} from "@/modules/faq/infrastructure/wiring";
import {
  crearHerramientaWired,
  darDeBajaHerramientaWired,
  editarHerramientaWired,
} from "@/modules/herramientas/infrastructure/wiring";
import { minutosDeTexto } from "@/modules/shared/domain/formato";

/**
 * Acciones de Administración.
 *
 * TODAS empiezan comprobando que quien llama administra. La comprobación vive
 * aquí, en el servidor, y no solo en si se pinta o no el enlace del menú:
 * esconder una pantalla no impide invocar su acción a mano.
 */
async function exigirAdmin() {
  const yo = await exigirSesion();
  if (!yo.isAdmin) {
    throw new Error("Se requieren permisos de administración.");
  }
  return yo;
}

export type Resultado = { ok: boolean; error?: string };

/**
 * La fecha de un `<input type="date">`, o `null` si no la pusieron.
 *
 * Se construye a MEDIODÍA y no a medianoche: un `new Date("2026-08-27")` se
 * interpreta como medianoche UTC, que en México es el día anterior por la
 * tarde, y la ficha acabaría diciendo que se impartió el 26.
 */
function fechaDelFormulario(valor: FormDataEntryValue | null): Date | null {
  const s = String(valor ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}


/* ── Capacitaciones ─────────────────────────────────────────────────────── */

export async function crearCapacitacion(form: FormData): Promise<Resultado> {
  const yo = await exigirAdmin();

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El título es obligatorio." };

  const duration = String(form.get("duration") ?? "").trim() || null;

  /*
   * El código se asigna SOLO, siguiendo la serie.
   *
   * Antes había que inventárselo, y eso deja huecos y repetidos en cuanto lo
   * hacen dos personas distintas. Es lo mismo que ya se hace con las fichas del
   * FAQ: la serie la lleva el sistema, que es quien sabe cuál fue la última.
   */
  const code = await siguienteCodigo();

  const id = await crearCapacitacionWired(
    {
      code,
      title,
      summary: String(form.get("summary") ?? "").trim() || null,
      instructor: String(form.get("instructor") ?? "").trim() || null,
      instructorRole: String(form.get("instructorRole") ?? "").trim() || null,
      duration,
      // Los minutos se derivan del texto para poder sumar duraciones sin pedir
      // el número por separado: quien captura escribe "2 h 40 min" y ya está.
      durationMin: minutosDeTexto(duration),
      level: String(form.get("level") ?? "Básico"),
      category: String(form.get("category") ?? "").trim() || null,
      software: String(form.get("software") ?? "").trim() || null,
      accent: String(form.get("accent") ?? "#32D66B"),
      period: String(form.get("period") ?? "").trim() || null,
      impartidaEn: fechaDelFormulario(form.get("impartidaEn")),
      objectives: String(form.get("objectives") ?? "")
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean),
    },
    yo.email,
  );

  /*
   * La carpeta de Drive se prepara AQUÍ, al crear.
   *
   * Así, cuando alguien vaya a subir el primer video, la carpeta ya existe con
   * sus tres subcarpetas y no tiene que preguntarse dónde va cada cosa.
   *
   * Si Drive falla no se pierde la capacitación: queda creada y la carpeta se
   * hará sola en la primera subida. Perder una ficha entera porque Drive tardó
   * en responder sería peor que quedarse sin carpeta un rato.
   */
  try {
    const carpetaId = await prepararCarpeta(code, title);
    await editarCapacitacionWired(id, { driveFolderId: carpetaId });
  } catch (e) {
    console.error(
      `[capacitacion] ${code} creada, pero su carpeta de Drive no: ` +
        `${e instanceof Error ? e.message : String(e)}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/capacitaciones");
  redirect(`/admin/capacitaciones/${id}`);
}

export async function editarCapacitacion(id: string, form: FormData): Promise<Resultado> {
  await exigirAdmin();

  const duration = String(form.get("duration") ?? "").trim() || null;

  await editarCapacitacionWired(id, {
    title: String(form.get("title") ?? "").trim(),
    summary: String(form.get("summary") ?? "").trim() || null,
    instructor: String(form.get("instructor") ?? "").trim() || null,
    instructorRole: String(form.get("instructorRole") ?? "").trim() || null,
    duration,
    durationMin: minutosDeTexto(duration),
    level: String(form.get("level") ?? "Básico"),
    category: String(form.get("category") ?? "").trim() || null,
    software: String(form.get("software") ?? "").trim() || null,
    accent: String(form.get("accent") ?? "#32D66B"),
    period: String(form.get("period") ?? "").trim() || null,
    impartidaEn: fechaDelFormulario(form.get("impartidaEn")),
    objectives: String(form.get("objectives") ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean),
  });

  revalidatePath(`/admin/capacitaciones/${id}`);
  revalidatePath(`/capacitaciones/${id}`);
  revalidatePath("/capacitaciones");
  return { ok: true };
}

export async function publicarCapacitacion(id: string): Promise<Resultado> {
  await exigirAdmin();

  const res = await publicarCapacitacionWired(id);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin");
  revalidatePath("/capacitaciones");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archivarCapacitacion(id: string): Promise<Resultado> {
  await exigirAdmin();
  await archivarCapacitacionWired(id);
  revalidatePath("/admin");
  revalidatePath("/capacitaciones");
  return { ok: true };
}

export async function borrarCapacitacion(id: string): Promise<Resultado> {
  await exigirAdmin();
  await eliminarCapacitacionWired(id);
  revalidatePath("/admin");
  revalidatePath("/capacitaciones");
  redirect("/admin");
}

export async function agregarTema(capId: string, form: FormData): Promise<Resultado> {
  await exigirAdmin();

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El tema necesita un título." };

  const cap = await verCapacitacionWired(capId);
  if (!cap) return { ok: false, error: "Esa capacitación ya no existe." };

  /*
   * El número del tema se calcula solo: 01, 02, 03…
   *
   * Antes había un campo para escribirlo, y quien captura tenía que acordarse
   * de cuál iba. Es un dato que el sistema ya sabe —basta mirar cuántos hay— y
   * pedirlo solo servía para que llegaran dos «03» y ningún «04».
   */
  const codigo = String(cap.temas.length + 1).padStart(2, "0");

  /*
   * El video, si lo hay, se trae a la carpeta del Centro.
   *
   * Pegar el enlace y dejarlo donde está era lo que hacía antes, y eso deja la
   * capacitación dependiendo del Drive de quien grabó. Ahora se copia: la
   * copia es nuestra, y copiar solo exige poder ver el original, así que no
   * hay que pedirle permisos a nadie.
   *
   * Si no se puede copiar —hay quien bloquea la copia—, se guarda el enlace
   * original y se avisa. Vale más un video enlazado que ningún video.
   */
  const enlaceVideo = String(form.get("videoUrl") ?? "").trim();
  let videoUrl: string | null = enlaceVideo || null;
  let videoDriveId: string | null = null;
  let videoPropio = false;
  let aviso: string | null = null;

  if (enlaceVideo) {
    const origen = idDesdeEnlace(enlaceVideo);

    if (origen) {
      try {
        const copia = await copiarArchivo(
          origen,
          cap.code ?? null,
          cap.title,
          "video",
          `${cap.code ? cap.code + " " : ""}${title}.mp4`,
        );
        videoUrl = `https://drive.google.com/file/d/${copia.driveId}/view`;
        videoDriveId = copia.driveId;
        videoPropio = true;
      } catch (e) {
        const motivo = e instanceof Error ? e.message : String(e);
        console.error(`[tema] no se pudo copiar el video: ${motivo}`);
        videoDriveId = origen;
        aviso =
          "El tema se creó, pero el video no se pudo copiar a la carpeta del Centro. " +
          "Queda enlazado donde está.";
      }
    }
    // Sin id reconocible —YouTube, Vimeo, un enlace directo— se guarda tal cual:
    // el reproductor ya sabe incrustar esas formas.
  }

  await agregarTemaWired(capId, {
    code: codigo,
    title,
    summary: String(form.get("summary") ?? "").trim() || null,
    kind: String(form.get("kind") ?? "Video"),
    duration: String(form.get("duration") ?? "").trim() || null,
    videoUrl,
    videoDriveId,
    videoPropio,
  });

  revalidatePath(`/admin/capacitaciones/${capId}`);
  revalidatePath(`/capacitaciones/${capId}`);

  return aviso ? { ok: true, error: aviso } : { ok: true };
}

/**
 * Sube un video desde la computadora y crea su tema.
 *
 * La otra mitad de agregar un tema: cuando la grabación no está en Drive sino
 * en el disco de quien la tiene. Sube a «01 Video» de esa capacitación,
 * renombrado con su código.
 *
 * OJO CON EL TAMAÑO. Las acciones de servidor tienen un tope —configurado en
 * `next.config`— y una grabación de una sesión larga puede pasarse. Cuando eso
 * ocurra, lo práctico es subirla a Drive desde el navegador y pegar el enlace:
 * el resultado es el mismo, porque de ahí se copia a la carpeta del Centro.
 */
export async function subirVideoTema(capId: string, form: FormData): Promise<Resultado> {
  await exigirAdmin();

  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "No llegó ningún archivo." };
  }

  if (!archivo.type.startsWith("video/")) {
    return { ok: false, error: "Ese archivo no es un video." };
  }

  const title = String(form.get("title") ?? "").trim() || "Grabación de la sesión";

  const cap = await verCapacitacionWired(capId);
  if (!cap) return { ok: false, error: "Esa capacitación ya no existe." };

  const codigo = String(cap.temas.length + 1).padStart(2, "0");

  try {
    const subido = await subirArchivo(
      archivo,
      cap.code ?? null,
      cap.title,
      "video",
      `${cap.code ? cap.code + " " : ""}${title}.mp4`,
    );

    await agregarTemaWired(capId, {
      code: codigo,
      title,
      kind: "Video",
      duration: String(form.get("duration") ?? "").trim() || null,
      videoUrl: `https://drive.google.com/file/d/${subido.driveId}/view`,
      videoDriveId: subido.driveId,
      videoPropio: true,
    });

    revalidatePath(`/admin/capacitaciones/${capId}`);
    revalidatePath(`/capacitaciones/${capId}`);
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[tema] no se pudo subir el video: ${motivo}`);

    // El tope del cuerpo de la petición da un error poco claro; se traduce.
    if (/body|size|limit|large|exceed/i.test(motivo)) {
      return {
        ok: false,
        error:
          "El video pesa demasiado para subirlo por aquí. Súbelo a Drive desde el " +
          "navegador y pega el enlace: se copiará igual a la carpeta del Centro.",
      };
    }

    return { ok: false, error: `No se pudo subir: ${motivo.slice(0, 160)}` };
  }
}

/**
 * Cambia el video de un tema que ya existe.
 *
 * Faltaba, y se notaba: en la edición se veía «con video» pero no CUÁL, así que
 * no había forma de comprobar a dónde apuntaba ni de corregirlo sin borrar el
 * tema entero y volver a crearlo.
 *
 * Importa sobre todo para los videos que aún viven en el Drive de quien grabó:
 * son los que un día dejan de abrirse, y hasta ahora no había manera de
 * repararlos desde aquí.
 *
 * Si el enlace es de Drive, se copia a la carpeta del Centro como en el alta.
 * Vaciar el campo quita el video y deja el tema sin él, que también hace falta
 * cuando el enlace apuntaba a algo que ya no existe.
 */
export async function cambiarVideoTema(
  temaId: string,
  capId: string,
  enlace: string,
): Promise<Resultado> {
  await exigirAdmin();

  const cap = await verCapacitacionWired(capId);
  if (!cap) return { ok: false, error: "Esa capacitación ya no existe." };

  const tema = cap.temas.find((t) => t.id === temaId);
  if (!tema) return { ok: false, error: "Ese tema ya no existe." };

  const limpio = enlace.trim();

  // Vaciar el campo quita el video.
  if (!limpio) {
    await editarTemaWired(temaId, {
      videoUrl: null,
      videoDriveId: null,
      videoPropio: false,
    });
    revalidatePath(`/admin/capacitaciones/${capId}`);
    revalidatePath(`/capacitaciones/${capId}`);
    return { ok: true };
  }

  const origen = idDesdeEnlace(limpio);

  // YouTube, Vimeo o un enlace directo: se guardan tal cual, el reproductor ya
  // sabe incrustarlos.
  if (!origen) {
    await editarTemaWired(temaId, {
      videoUrl: limpio,
      videoDriveId: null,
      videoPropio: false,
    });
    revalidatePath(`/admin/capacitaciones/${capId}`);
    revalidatePath(`/capacitaciones/${capId}`);
    return { ok: true };
  }

  // Si ya es el mismo archivo que está copiado, no se vuelve a copiar.
  if (origen === tema.videoDriveId && tema.videoPropio) {
    return { ok: true };
  }

  try {
    const copia = await copiarArchivo(
      origen,
      cap.code ?? null,
      cap.title,
      "video",
      `${cap.code ? cap.code + " " : ""}${tema.title}.mp4`,
    );

    await editarTemaWired(temaId, {
      videoUrl: `https://drive.google.com/file/d/${copia.driveId}/view`,
      videoDriveId: copia.driveId,
      videoPropio: true,
    });

    revalidatePath(`/admin/capacitaciones/${capId}`);
    revalidatePath(`/capacitaciones/${capId}`);
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[tema] no se pudo copiar el video: ${motivo}`);

    /*
     * No se pudo copiar, pero el enlace se guarda igual.
     *
     * El caso real: el archivo es de otra persona y esta cuenta no lo alcanza.
     * Guardar el enlace deja la ficha utilizable para quien sí lo vea, y el
     * aviso dice exactamente qué pasó en vez de dejarlo como un fallo mudo.
     */
    await editarTemaWired(temaId, {
      videoUrl: limpio,
      videoDriveId: origen,
      videoPropio: false,
    });

    revalidatePath(`/admin/capacitaciones/${capId}`);
    revalidatePath(`/capacitaciones/${capId}`);

    const sinAcceso = /not found|404|permission|403/i.test(motivo);
    return {
      ok: true,
      error: sinAcceso
        ? "El enlace se guardó, pero el video no se pudo copiar a la carpeta del Centro: " +
          "tu cuenta no puede abrirlo. Pide que te lo compartan y vuelve a intentarlo."
        : `El enlace se guardó, pero no se pudo copiar: ${motivo.slice(0, 120)}`,
    };
  }
}

export async function borrarTema(temaId: string, capId: string): Promise<Resultado> {
  await exigirAdmin();
  await eliminarTemaWired(temaId);
  revalidatePath(`/admin/capacitaciones/${capId}`);
  revalidatePath(`/capacitaciones/${capId}`);
  return { ok: true };
}

export async function agregarMaterial(
  temaId: string,
  capId: string,
  form: FormData,
): Promise<Resultado> {
  await exigirAdmin();

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El material necesita un nombre." };

  const url = String(form.get("url") ?? "").trim() || null;
  // De un enlace de Drive se saca el id: con él se puede incrustar en el visor
  // en vez de mandar a la persona fuera del Centro.
  const driveId = url?.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;

  await agregarMaterialWired(temaId, {
    title,
    kind: String(form.get("kind") ?? "PDF"),
    url,
    driveId,
    sizeText: String(form.get("sizeText") ?? "").trim() || null,
    downloadable: form.get("downloadable") !== null,
  });

  revalidatePath(`/admin/capacitaciones/${capId}`);
  revalidatePath(`/capacitaciones/${capId}`);
  return { ok: true };
}

export async function borrarMaterial(materialId: string, capId: string): Promise<Resultado> {
  await exigirAdmin();
  await eliminarMaterialWired(materialId);
  revalidatePath(`/admin/capacitaciones/${capId}`);
  revalidatePath(`/capacitaciones/${capId}`);
  return { ok: true };
}

/* ── Rutas ──────────────────────────────────────────────────────────────── */

export async function crearRuta(form: FormData): Promise<Resultado> {
  const yo = await exigirAdmin();

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "La ruta necesita un nombre." };

  const id = await crearRutaWired(
    { name, objective: String(form.get("objective") ?? "").trim() || null },
    yo.email,
  );

  revalidatePath("/admin");
  redirect(`/admin/rutas/${id}`);
}

export async function agregarEtapa(rutaId: string, form: FormData): Promise<Resultado> {
  await exigirAdmin();

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "La etapa necesita un nombre." };

  await agregarEtapaWired(rutaId, {
    code: String(form.get("code") ?? "").trim() || "Etapa",
    name,
    description: String(form.get("description") ?? "").trim() || null,
  });

  revalidatePath(`/admin/rutas/${rutaId}`);
  revalidatePath("/ruta");
  return { ok: true };
}

export async function borrarEtapa(etapaId: string, rutaId: string): Promise<Resultado> {
  await exigirAdmin();
  await eliminarEtapaWired(etapaId);
  revalidatePath(`/admin/rutas/${rutaId}`);
  revalidatePath("/ruta");
  return { ok: true };
}

export async function agregarItemRuta(
  etapaId: string,
  rutaId: string,
  form: FormData,
): Promise<Resultado> {
  await exigirAdmin();

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El elemento necesita un título." };

  await agregarItemWired(etapaId, {
    title,
    trainingId: String(form.get("trainingId") ?? "").trim() || null,
    resourceCode: String(form.get("resourceCode") ?? "").trim() || null,
    duration: String(form.get("duration") ?? "").trim() || null,
  });

  revalidatePath(`/admin/rutas/${rutaId}`);
  revalidatePath("/ruta");
  return { ok: true };
}

export async function borrarItemRuta(itemId: string, rutaId: string): Promise<Resultado> {
  await exigirAdmin();
  await eliminarItemWired(itemId);
  revalidatePath(`/admin/rutas/${rutaId}`);
  revalidatePath("/ruta");
  return { ok: true };
}

export async function borrarRuta(id: string): Promise<Resultado> {
  await exigirAdmin();
  await eliminarRutaWired(id);
  revalidatePath("/admin");
  revalidatePath("/ruta");
  redirect("/admin");
}

export async function asignarRuta(rutaId: string, email: string): Promise<Resultado> {
  const yo = await exigirAdmin();

  const limpio = email.trim().toLowerCase();
  if (!limpio.includes("@")) {
    return { ok: false, error: "Escribe un correo válido." };
  }

  await asignarRutaWired(rutaId, limpio, yo.email);
  revalidatePath(`/admin/rutas/${rutaId}`);
  revalidatePath("/ruta");
  return { ok: true };
}

export async function desasignarRuta(rutaId: string, email: string): Promise<Resultado> {
  await exigirAdmin();
  await desasignarRutaWired(rutaId, email);
  revalidatePath(`/admin/rutas/${rutaId}`);
  revalidatePath("/ruta");
  return { ok: true };
}

/* ── FAQ ────────────────────────────────────────────────────────────────── */

export async function crearFaq(form: FormData): Promise<Resultado> {
  const yo = await exigirAdmin();

  const res = await crearFaqWired(
    {
      category: String(form.get("category") ?? "").trim(),
      question: String(form.get("question") ?? "").trim(),
      answer: String(form.get("answer") ?? "").trim(),
      steps: String(form.get("steps") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      resourceCode: String(form.get("resourceCode") ?? "").trim() || null,
      trainingId: String(form.get("trainingId") ?? "").trim() || null,
      toolId: String(form.get("toolId") ?? "").trim() || null,
    },
    yo.email,
  );

  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin");
  revalidatePath("/faq");
  return { ok: true };
}

export async function editarFaq(id: string, form: FormData): Promise<Resultado> {
  await exigirAdmin();

  const res = await editarFaqWired(id, {
    category: String(form.get("category") ?? "").trim(),
    question: String(form.get("question") ?? "").trim(),
    answer: String(form.get("answer") ?? "").trim(),
    steps: String(form.get("steps") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  });

  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/admin");
  revalidatePath("/faq");
  return { ok: true };
}

export async function borrarFaq(id: string): Promise<Resultado> {
  await exigirAdmin();
  await eliminarFaqWired(id);
  revalidatePath("/admin");
  revalidatePath("/faq");
  return { ok: true };
}

/* ── Herramientas ───────────────────────────────────────────────────────── */

export async function crearHerramienta(form: FormData): Promise<Resultado> {
  await exigirAdmin();

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "La herramienta necesita un nombre." };

  await crearHerramientaWired({
    name,
    kind: String(form.get("kind") ?? "Software"),
    description: String(form.get("description") ?? "").trim() || null,
    version: String(form.get("version") ?? "").trim() || null,
    license: String(form.get("license") ?? "").trim() || null,
    discipline: String(form.get("discipline") ?? "").trim() || null,
    accent: String(form.get("accent") ?? "#32D66B"),
    status: (String(form.get("status") ?? "DISPONIBLE") as
      | "DISPONIBLE"
      | "PILOTO"
      | "EN_EVALUACION"
      | "DESCONTINUADO"),
  });

  revalidatePath("/admin");
  revalidatePath("/herramientas");
  return { ok: true };
}

export async function editarHerramienta(id: string, form: FormData): Promise<Resultado> {
  await exigirAdmin();

  await editarHerramientaWired(id, {
    name: String(form.get("name") ?? "").trim(),
    kind: String(form.get("kind") ?? "Software"),
    description: String(form.get("description") ?? "").trim() || null,
    version: String(form.get("version") ?? "").trim() || null,
    license: String(form.get("license") ?? "").trim() || null,
    discipline: String(form.get("discipline") ?? "").trim() || null,
    status: (String(form.get("status") ?? "DISPONIBLE") as
      | "DISPONIBLE"
      | "PILOTO"
      | "EN_EVALUACION"
      | "DESCONTINUADO"),
  });

  revalidatePath("/admin");
  revalidatePath("/herramientas");
  return { ok: true };
}

export async function darDeBajaHerramienta(id: string): Promise<Resultado> {
  await exigirAdmin();
  await darDeBajaHerramientaWired(id);
  revalidatePath("/admin");
  revalidatePath("/herramientas");
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PROPUESTAS DEL EQUIPO
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Aprueba una propuesta: la convierte en ficha publicada y avisa a quien la
 * mandó.
 *
 * La ficha nace SIN código: los códigos del catálogo (`RVT-041`) los asigna
 * Estandarización y Calidad en su Excel, y que la aplicación inventara uno
 * abriría la puerta a que dos fichas acaben con el mismo. Se publica sin él y
 * el área se lo pone cuando la incorpore a su serie.
 */
export async function aprobarPropuesta(
  id: string,
  form: FormData,
): Promise<Resultado> {
  const yo = await exigirAdmin();

  const propuesta = await verPropuestaWired(id);
  if (!propuesta) return { ok: false, error: "Esa propuesta ya no existe." };
  if (propuesta.status !== "PENDIENTE") {
    return { ok: false, error: "Esa propuesta ya se resolvió." };
  }

  /*
   * Lo que el administrador vio y —si hizo falta— corrigió.
   *
   * Se toma del formulario y no de la propuesta: la pantalla de revisión deja
   * editar el título, el síntoma, la solución y la clasificación antes de
   * publicar. Casi ninguna propuesta llega redactada como para publicarse tal
   * cual, y obligar a aprobar-y-luego-editar deja la ficha mal escrita en
   * público durante ese rato.
   */
  const category = String(form.get("category") ?? "").trim();
  const platform = String(form.get("platform") ?? "").trim() || null;
  const question = String(form.get("question") ?? "").trim() || propuesta.title;
  const symptom = String(form.get("symptom") ?? "").trim() || propuesta.description;
  const solucion = String(form.get("solution") ?? "").trim();
  /*
   * EL CÓDIGO SE PONE SOLO.
   *
   * Si el administrador no escribió uno, se toma el siguiente libre de la serie
   * que corresponde al software —`RVT-069` tras `RVT-068`—. Dejarlo en blanco
   * tenía dos consecuencias malas: la ficha quedaba sin la referencia con la
   * que el equipo se habla («checa la RVT-041»), y la captura conservaba el
   * nombre derivado del título en vez de llamarse como su ficha.
   *
   * Se respeta lo que se haya escrito a mano: el área a veces reserva un código
   * concreto.
   */
  const codeManual = String(form.get("code") ?? "").trim().toUpperCase() || null;
  const code = codeManual ?? (await generarCodigo(platform));

  if (!category) return { ok: false, error: "Elige la subcategoría." };
  if (question.length < 8) return { ok: false, error: "El título es muy corto." };

  /*
   * La respuesta tiene que dar el mínimo que exige el dominio (15 caracteres).
   * Se compone de lo que haya: la solución si la escribieron, y si no, el
   * síntoma. Antes esto fallaba en silencio —el `catch` se tragaba el error de
   * validación— y la propuesta quedaba marcada como aprobada SIN ficha.
   */
  const answer = solucion || symptom;
  if (answer.trim().length < 15) {
    return {
      ok: false,
      error: "Escribe una solución o un síntoma más largo: es lo que se publica como respuesta.",
    };
  }

  const pasos = solucion
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  try {
    /*
     * Si cambió la clasificación, la captura se muda de carpeta en Drive.
     *
     * La imagen se archivó donde dijo quien propuso, que muchas veces no sabe
     * en qué categoría va. Al corregirla aquí, el archivo tiene que seguirla:
     * si no, la carpeta de Drive acabaría diciendo una cosa y la ficha otra.
     */
    let imageDriveId = propuesta.imageDriveId;
    const imageName = propuesta.imageName;

    if (imageDriveId) {
      const movida = await reubicarCaptura(imageDriveId, {
        codigo: code,
        categoria: platform,
        subcategoria: category,
      }).catch(() => null);

      if (movida) imageDriveId = movida;
    }

    /*
     * Se reintenta si el código ya estaba tomado.
     *
     * La base tiene el código como único, y entre calcular el siguiente y
     * escribirlo puede haberse publicado otra ficha de la misma serie. En vez
     * de fallar con un error de restricción —que a quien revisa no le dice
     * nada—, se vuelve a pedir el siguiente y se intenta otra vez. Dos vueltas
     * bastan: el conflicto es raro y no se encadena.
     */
    let res = await crearFaqWired(
      {
        category,
        question,
        answer,
        symptom,
        steps: pasos,
        platform,
        code,
        imageDriveId,
        imageName,
        published: true,
      },
      yo.email,
    ).catch(() => null);

    if (!res && !codeManual) {
      const otro = await generarCodigo(platform);
      res = await crearFaqWired(
        {
          category,
          question,
          answer,
          symptom,
          steps: pasos,
          platform,
          code: otro,
          imageDriveId,
          imageName,
          published: true,
        },
        yo.email,
      ).catch(() => null);
    }

    if (!res) {
      return {
        ok: false,
        error: codeManual
          ? `El código ${codeManual} ya está en uso. Elige otro o deja el campo vacío.`
          : "No se pudo crear la ficha.",
      };
    }

    // `crearFaq` devuelve `{ok, valor}`, no el id suelto: leerlo como string
    // dejaba `faqId` nulo y escondía los errores de validación.
    if (!res.ok) {
      return { ok: false, error: res.error ?? "No se pudo crear la ficha." };
    }

    await resolverPropuestaWired(id, {
      status: "APROBADA",
      reviewedBy: yo.email,
      faqId: res.valor,
    });

    await avisarWired({
      email: propuesta.email,
      kind: "FAQ_RESUELTA",
      title: "Tu ficha se publicó",
      body: question,
      href: code ? `/faq/${code}` : `/faq/${res.valor}`,
      ref: id,
    }).catch(() => undefined);

    revalidatePath("/admin/faq");
    revalidatePath("/faq");
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "No se pudo aprobar la propuesta.";
    return { ok: false, error: motivo };
  }
}

/** Rechaza una propuesta, con el motivo. */
export async function rechazarPropuesta(
  id: string,
  form: FormData,
): Promise<Resultado> {
  const yo = await exigirAdmin();

  const propuesta = await verPropuestaWired(id);
  if (!propuesta) return { ok: false, error: "Esa propuesta ya no existe." };

  /*
   * El motivo es obligatorio. Un rechazo sin explicación se vive como un
   * portazo, y quien propuso algo de buena fe merece saber por qué no siguió
   * adelante —muchas veces es que ya existe otra ficha igual—.
   */
  const reviewNote = String(form.get("reviewNote") ?? "").trim();
  if (reviewNote.length < 5) {
    return { ok: false, error: "Escribe el motivo: quien propuso merece saberlo." };
  }

  try {
    await resolverPropuestaWired(id, {
      status: "RECHAZADA",
      reviewedBy: yo.email,
      reviewNote,
    });

    await avisarWired({
      email: propuesta.email,
      kind: "FAQ_RESUELTA",
      title: "Tu ficha no se publicó",
      body: reviewNote,
      href: "/faq",
      ref: id,
    }).catch(() => undefined);

    revalidatePath("/admin/faq");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo rechazar la propuesta." };
  }
}

/** Marca un comentario como atendido. */
/**
 * Acepta un comentario y lo convierte en ficha publicada.
 *
 * Antes esto solo lo marcaba como «atendido» y ahí moría: el comentario
 * desaparecía de la bandeja sin dejar nada en el FAQ, de modo que el trabajo de
 * quien lo escribió no llegaba a ninguna parte. Aceptar ahora significa
 * publicarlo, que es lo que la gente espera al aceptar algo.
 */
export async function aceptarComentario(id: string): Promise<Resultado> {
  const yo = await exigirAdmin();

  const comentario = await verComentarioWired(id);
  if (!comentario) return { ok: false, error: "Ese comentario ya no existe." };
  if (comentario.resolved) return { ok: false, error: "Ese comentario ya se resolvió." };

  try {
    /*
     * Aceptar es UN SOLO GESTO: se aprueba y ya.
     *
     * No se pregunta título ni categoría porque el comentario YA trae su sitio
     * —la ficha desde la que se escribió— y su texto. Pedir que se reclasifique
     * a mano convertía un «sí, tiene razón» en un formulario, que es la manera
     * más segura de que la bandeja se quede sin atender.
     */
    await aceptarComentarioWired(id, yo.email);

    await avisarWired({
      email: comentario.email,
      kind: "FAQ_RESUELTA",
      title: "Tu comentario se aceptó",
      body: comentario.message.slice(0, 90),
      href: comentario.faqId ? `/faq/${comentario.faqId}` : "/faq",
      ref: `comentario:${id}`,
    }).catch(() => undefined);

    revalidatePath("/admin/faq");
    revalidatePath("/faq");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo aceptar el comentario." };
  }
}

/** Rechaza un comentario: se cierra sin publicar, y quien lo mandó se entera. */
export async function rechazarComentario(id: string, form: FormData): Promise<Resultado> {
  const yo = await exigirAdmin();

  const comentario = await verComentarioWired(id);
  if (!comentario) return { ok: false, error: "Ese comentario ya no existe." };

  const motivo = String(form.get("motivo") ?? "").trim();
  if (motivo.length < 5) {
    return { ok: false, error: "Escribe el motivo: quien comentó merece saberlo." };
  }

  try {
    await rechazarComentarioWired(id, yo.email, motivo);

    await avisarWired({
      email: comentario.email,
      kind: "FAQ_RESUELTA",
      title: "Tu comentario se revisó",
      body: motivo,
      href: "/faq",
      ref: `comentario:${id}`,
    }).catch(() => undefined);

    revalidatePath("/admin/faq");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo cerrar el comentario." };
  }
}

/**
 * Lleva las capturas del catálogo a la carpeta «FAQ Web».
 *
 * Se lanza a mano desde Administración y no en cada arranque: es una operación
 * de una sola vez —las capturas nuevas ya nacen en el sitio correcto— y copiar
 * cincuenta archivos en Drive tarda lo suyo.
 */
export async function ordenarCapturasFaq(): Promise<
  Resultado & { copiadas?: number; yaEstaban?: number; fallaron?: number }
> {
  await exigirAdmin();

  try {
    const r = await ordenarCapturas();
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
    return { ok: true, copiadas: r.copiadas, yaEstaban: r.yaEstaban, fallaron: r.fallaron };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "No se pudieron ordenar las capturas.";
    return { ok: false, error: motivo };
  }
}

/* ── Permisos del equipo ────────────────────────────────────────────────── */

/**
 * Guarda lo que puede hacer una persona.
 *
 * Solo administración: dar permisos es exactamente la clase de acción que hay
 * que comprobar en el servidor, porque esconder la pantalla no impide invocar
 * la acción a mano.
 */
export async function guardarPermisosDe(
  correo: string,
  permisos: { esAdmin: boolean; revisaFaq: boolean; secciones: string[] },
): Promise<Resultado> {
  const yo = await exigirAdmin();

  if (!correo.trim()) return { ok: false, error: "Falta el correo de la persona." };

  /*
   * Nadie puede quitarse a sí mismo la administración.
   *
   * Sin esto, un descuido deja la aplicación sin ningún administrador y la
   * única salida es tocar la base a mano —o la variable `GRID_ADMINS`—.
   */
  if (correo.toLowerCase() === yo.email.toLowerCase() && !permisos.esAdmin) {
    return { ok: false, error: "No puedes quitarte a ti mismo la administración." };
  }

  try {
    await guardarPermisos(correo, permisos, yo.email);
    revalidatePath("/admin/equipo");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudieron guardar los permisos." };
  }
}

/**
 * Sube un archivo a la carpeta de una capacitación y lo cuelga de un tema.
 *
 * El archivo va a la subcarpeta que le toca según lo que sea: un video a
 * «01 Video», lo demás a «02 Materiales». Se renombra con el código delante
 * para que en Drive se sepa de qué capacitación es sin abrir la carpeta.
 */
export async function subirMaterial(
  temaId: string,
  capId: string,
  form: FormData,
): Promise<Resultado> {
  await exigirAdmin();

  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "No llegó ningún archivo." };
  }

  const cap = await verCapacitacionWired(capId);
  if (!cap) return { ok: false, error: "Esa capacitación ya no existe." };

  const esVideo = archivo.type.startsWith("video/");
  const titulo = (form.get("titulo") as string | null)?.trim() || archivo.name;

  try {
    const subido = await subirArchivo(
      archivo,
      cap.code ?? null,
      cap.title,
      esVideo ? "video" : "materiales",
      `${cap.code ? cap.code + " " : ""}${titulo}`,
    );

    if (esVideo) {
      await editarTemaWired(temaId, {
        videoUrl: `https://drive.google.com/file/d/${subido.driveId}/view`,
        videoDriveId: subido.driveId,
        videoPropio: true,
      });
    } else {
      await agregarMaterialWired(temaId, {
        title: titulo,
        kind: tipoDeArchivo(archivo.name, archivo.type),
        driveId: subido.driveId,
        url: `https://drive.google.com/file/d/${subido.driveId}/view`,
        sizeText: tamanoLegible(archivo.size),
        subcarpeta: "02 Materiales",
      });
    }

    revalidatePath(`/admin/capacitaciones/${capId}`);
    revalidatePath(`/capacitaciones/${capId}`);
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[material] no se pudo subir: ${motivo}`);
    return { ok: false, error: `No se pudo subir a Drive: ${motivo.slice(0, 160)}` };
  }
}

/**
 * Trae a la carpeta del Centro un archivo que ya vive en Drive.
 *
 * La otra mitad de subir: cuando el material ya está en Drive —el Drive de
 * quien lo grabó, normalmente—, se COPIA aquí en vez de pedir que lo bajen y
 * lo vuelvan a subir. Copiar solo exige poder verlo, así que no hace falta
 * cambiarle los permisos a nadie.
 */
export async function copiarMaterialDeDrive(
  temaId: string,
  capId: string,
  enlace: string,
  titulo: string,
): Promise<Resultado> {
  await exigirAdmin();

  const origen = idDesdeEnlace(enlace);
  if (!origen) return { ok: false, error: "Ese enlace no parece de Google Drive." };

  const cap = await verCapacitacionWired(capId);
  if (!cap) return { ok: false, error: "Esa capacitación ya no existe." };

  try {
    const copia = await copiarArchivo(
      origen,
      cap.code ?? null,
      cap.title,
      "materiales",
      `${cap.code ? cap.code + " " : ""}${titulo.trim() || "Material"}`,
    );

    await agregarMaterialWired(temaId, {
      title: titulo.trim() || copia.nombre,
      kind: tipoDeArchivo(copia.nombre, ""),
      driveId: copia.driveId,
      url: `https://drive.google.com/file/d/${copia.driveId}/view`,
      subcarpeta: "02 Materiales",
    });

    revalidatePath(`/admin/capacitaciones/${capId}`);
    revalidatePath(`/capacitaciones/${capId}`);
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `No se pudo copiar: ${motivo.slice(0, 160)}` };
  }
}

/** De qué tipo es, para que el visor sepa cómo abrirlo. */
function tipoDeArchivo(nombre: string, mime: string): string {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "PDF";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (["xls", "xlsx", "csv"].includes(ext)) return "XLS";
  if (["doc", "docx"].includes(ext)) return "DOC";
  if (ext === "rvt") return "RVT";
  if (["zip", "rar", "7z"].includes(ext)) return "ZIP";
  return "LINK";
}

/** «2.4 MB», para enseñarlo junto al material. */
function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
