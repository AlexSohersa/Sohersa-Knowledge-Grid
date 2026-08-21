"use server";

import { revalidatePath } from "next/cache";
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
import { crearFaqWired, editarFaqWired, eliminarFaqWired } from "@/modules/faq/infrastructure/wiring";
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
