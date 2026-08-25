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
  eliminarCapacitacionWired,
  eliminarMaterialWired,
  eliminarTemaWired,
  publicarCapacitacionWired,
} from "@/modules/capacitaciones/infrastructure/wiring";
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

/* ── Capacitaciones ─────────────────────────────────────────────────────── */

export async function crearCapacitacion(form: FormData): Promise<Resultado> {
  const yo = await exigirAdmin();

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El título es obligatorio." };

  const duration = String(form.get("duration") ?? "").trim() || null;

  const id = await crearCapacitacionWired(
    {
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
      objectives: String(form.get("objectives") ?? "")
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean),
    },
    yo.email,
  );

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

  await agregarTemaWired(capId, {
    code: String(form.get("code") ?? "").trim() || "00",
    title,
    summary: String(form.get("summary") ?? "").trim() || null,
    kind: String(form.get("kind") ?? "Video"),
    duration: String(form.get("duration") ?? "").trim() || null,
    videoUrl: String(form.get("videoUrl") ?? "").trim() || null,
  });

  revalidatePath(`/admin/capacitaciones/${capId}`);
  revalidatePath(`/capacitaciones/${capId}`);
  return { ok: true };
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
