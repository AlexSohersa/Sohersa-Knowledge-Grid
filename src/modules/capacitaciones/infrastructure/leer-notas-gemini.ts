// Módulo CAPACITACIONES · INFRAESTRUCTURA · Leer unas notas de Gemini.
//
// Cada capacitación que se da por Meet deja un documento de notas generado por
// Gemini, y ese documento ya trae casi todo lo que necesita una ficha: el
// título, la fecha, quién la impartió, un resumen, el desglose por temas y el
// enlace a la grabación.
//
// Copiar eso a mano son veinte minutos por capacitación y algún dato que se
// escribe mal. Esto lo lee y lo propone; quien importa revisa y corrige antes
// de guardar, que es donde debe estar el juicio humano.
//
// LO QUE SE LEE ES TEXTO AJENO. Las notas las escribe Gemini a partir de lo que
// se dijo en una reunión, así que aquí se tratan como DATOS: se extraen campos
// y se recortan a lo razonable. Nada de lo que venga dentro cambia el
// comportamiento de la importación.

import "server-only";

import { getOAuth } from "@/lib/google/client";
import { google } from "googleapis";
import { idDesdeEnlace } from "./carpeta-drive";

/** Lo que se saca de un documento de notas. */
export interface NotasLeidas {
  /** El título, ya sin la marca de fecha que añade Gemini. */
  titulo: string;
  /** Cuándo se impartió, si el documento lo dice. */
  fecha: Date | null;
  /** El resumen de la sesión, tal como lo redactó Gemini. */
  resumen: string | null;
  /** Cada punto del desglose: un tema de la ficha. */
  temas: { titulo: string; detalle: string }[];
  /** Los «próximos pasos», que valen como objetivos de la capacitación. */
  objetivos: string[];
  /** El id de Drive de la grabación, si las notas la enlazan. */
  grabacionId: string | null;
  /** Quién aparece impartiendo, deducido de quién conduce los detalles. */
  instructor: string | null;
  /** Cuánta gente asistió. Da idea de si fue general o de equipo. */
  asistentes: number;
}

export class NotasError extends Error {}

/**
 * Lee un documento de notas de Gemini y saca de él una ficha.
 *
 * Corre con la cuenta de QUIEN LO PIDE: si esa persona no puede abrir el
 * documento, esto falla igual que le fallaría a ella en el navegador. No hay
 * forma de que la aplicación vea más de lo que ve quien la usa.
 */
export async function leerNotasGemini(enlace: string): Promise<NotasLeidas> {
  const id = idDesdeEnlace(enlace);
  if (!id) {
    throw new NotasError(
      "Ese enlace no parece de Google Drive. Copia la dirección desde la barra del navegador.",
    );
  }

  const auth = await getOAuth();
  const docs = google.docs({ version: "v1", auth });

  let texto: string;
  try {
    const doc = await docs.documents.get({ documentId: id });
    texto = textoPlano(doc.data);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);

    /*
     * El caso frecuente merece su propio mensaje.
     *
     * Google responde 404 tanto cuando el documento no existe como cuando
     * existe pero esta cuenta no lo puede ver, y son dos problemas muy
     * distintos para quien está importando.
     */
    if (/not found|404/i.test(motivo)) {
      throw new NotasError(
        "No se pudo abrir el documento con tu cuenta. Comprueba que lo tienes compartido y que es un documento de Google, no un PDF.",
      );
    }
    throw new NotasError(`Google no dejó leer las notas: ${motivo}`);
  }

  return interpretar(texto);
}

/** El documento, aplanado a texto con sus enlaces conservados. */
function textoPlano(doc: {
  body?: { content?: unknown[] } | null;
}): string {
  const partes: string[] = [];

  const recorrer = (nodos: unknown[]): void => {
    for (const nodo of nodos) {
      if (!nodo || typeof nodo !== "object") continue;
      const n = nodo as Record<string, unknown>;

      const parrafo = n.paragraph as { elements?: unknown[] } | undefined;
      if (parrafo?.elements) {
        const linea: string[] = [];
        for (const el of parrafo.elements) {
          const e = el as Record<string, unknown> | null;
          const run = e?.textRun as
            | { content?: string; textStyle?: { link?: { url?: string } } }
            | undefined;
          if (!run?.content) continue;

          const url = run.textStyle?.link?.url;
          // El enlace se conserva pegado al texto: es de donde sale la
          // grabación, que en el documento es solo la palabra «Grabación».
          linea.push(url ? `${run.content.trim()} <${url}>` : run.content);
        }
        partes.push(linea.join(""));
      }

      const tabla = n.table as { tableRows?: unknown[] } | undefined;
      if (tabla?.tableRows) {
        for (const fila of tabla.tableRows) {
          const f = fila as { tableCells?: unknown[] } | null;
          for (const celda of f?.tableCells ?? []) {
            const c = celda as { content?: unknown[] } | null;
            if (c?.content) recorrer(c.content);
          }
        }
      }
    }
  };

  recorrer(doc.body?.content ?? []);
  return partes.join("\n");
}

/** Del texto plano a los campos de la ficha. */
function interpretar(texto: string): NotasLeidas {
  const lineas = texto.split("\n").map((l) => l.trim());

  return {
    titulo: sacarTitulo(lineas),
    fecha: sacarFecha(texto),
    resumen: sacarBloque(lineas, "Resumen"),
    temas: sacarTemas(lineas),
    objetivos: sacarObjetivos(lineas),
    grabacionId: sacarGrabacion(texto),
    instructor: sacarInstructor(texto),
    asistentes: contarAsistentes(texto),
  };
}

/**
 * El título, sin la marca que Gemini le añade.
 *
 * Los documentos se llaman «Capacitación Design Thinking: 2026/08/21 12:58 CST
 * - Notas de Gemini», y de todo eso lo único que sirve como título de ficha es
 * la primera parte.
 */
function sacarTitulo(lineas: string[]): string {
  /*
   * El título es el encabezado de nivel 2, no la primera línea con texto.
   *
   * Se comprobó con las notas reales: antes del título va una línea suelta con
   * la fecha —«ago 27, 2026»—, y quedarse con la primera línea no vacía daba
   * esa fecha como nombre de la capacitación.
   */
  for (const l of lineas) {
    if (!/^##\s/.test(l)) continue;
    const t = normalizarTitulo(l.replace(/^##\s*/, ""));
    if (t.length > 3) return t;
  }

  // Sin encabezado, la primera línea que no sea la fecha ni una sección.
  for (const l of lineas) {
    if (!l || l.startsWith("#")) continue;
    if (/^(Invitado|Archivos adjuntos|Registros)/.test(l)) continue;
    if (esSoloFecha(l)) continue;
    const t = normalizarTitulo(l);
    if (t.length > 3) return t;
  }

  return "Capacitación sin título";
}

/** Fuera la marca de fecha y el «Notas de Gemini» que añade el documento. */
function normalizarTitulo(s: string): string {
  return limpiarMarcas(s)
    .replace(/\s*:\s*\d{4}\/\d{2}\/\d{2}.*$/, "")
    .replace(/\s*-\s*Notas de Gemini\s*$/i, "")
    .trim()
    .slice(0, 160);
}

/** ¿Esta línea es solo una fecha? «ago 27, 2026», «2026/08/27». */
function esSoloFecha(l: string): boolean {
  const s = limpiarMarcas(l);
  return (
    /^\d{4}\/\d{2}\/\d{2}$/.test(s) ||
    /^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\w*\s+\d{1,2},?\s+\d{4}$/i.test(s)
  );
}

/** La fecha de la sesión: «2026/08/21» o «ago 21, 2026». */
function sacarFecha(texto: string): Date | null {
  const iso = texto.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }

  const MESES: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
  };
  const es = texto.match(/\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\w*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (es) {
    const mes = MESES[es[1].toLowerCase().slice(0, 3)];
    if (mes !== undefined) {
      const d = new Date(Number(es[3]), mes, Number(es[2]));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/** El texto que sigue a un encabezado, hasta el siguiente. */
function sacarBloque(lineas: string[], encabezado: string): string | null {
  const i = lineas.findIndex((l) => esEncabezado(l, encabezado));
  if (i === -1) return null;

  const dentro: string[] = [];
  for (let j = i + 1; j < lineas.length; j++) {
    const l = lineas[j];
    if (esEncabezadoCualquiera(l)) break;
    if (l) dentro.push(limpiarMarcas(l));
  }

  const t = dentro.join("\n").trim();
  return t ? t.slice(0, 4000) : null;
}

/**
 * Cada punto del desglose es un tema de la ficha.
 *
 * Gemini los escribe como «**Título del punto**: lo que pasó», que separa
 * limpiamente el nombre del tema de su contenido. Cuando no trae esa forma, el
 * punto entero va como detalle y el título se recorta de su principio.
 */
function sacarTemas(lineas: string[]): { titulo: string; detalle: string }[] {
  const i = lineas.findIndex((l) => esEncabezado(l, "Detalles"));
  if (i === -1) return [];

  const temas: { titulo: string; detalle: string }[] = [];

  for (let j = i + 1; j < lineas.length; j++) {
    const l = lineas[j];
    if (esEncabezadoCualquiera(l)) break;

    const punto = l.match(/^[-·•*]\s+(.+)$/);
    if (!punto) continue;

    const cuerpo = limpiarMarcas(punto[1]);
    const conTitulo = cuerpo.match(/^(.{3,120}?):\s+(.+)$/);

    if (conTitulo) {
      temas.push({
        titulo: conTitulo[1].trim().slice(0, 160),
        detalle: conTitulo[2].trim().slice(0, 2000),
      });
    } else {
      temas.push({
        titulo: cuerpo.slice(0, 80).trim() + (cuerpo.length > 80 ? "…" : ""),
        detalle: cuerpo.slice(0, 2000),
      });
    }
  }

  return temas;
}

/** Los «próximos pasos», que sirven de objetivos. */
function sacarObjetivos(lineas: string[]): string[] {
  const i = lineas.findIndex((l) => esEncabezado(l, "Próximos pasos"));
  if (i === -1) return [];

  const out: string[] = [];
  for (let j = i + 1; j < lineas.length && out.length < 12; j++) {
    const l = lineas[j];
    if (esEncabezadoCualquiera(l)) break;

    const punto = l.match(/^[-·•*]\s+(.+)$/);
    if (!punto) continue;

    // Gemini antepone a quién le toca, entre corchetes. Eso es de la reunión,
    // no de la capacitación, así que fuera.
    const t = limpiarMarcas(punto[1]).replace(/^\[[^\]]*\]\s*/, "").trim();
    if (t) out.push(t.slice(0, 300));
  }

  return out;
}

/** El id de la grabación, del enlace que las notas ponen bajo «Registros». */
function sacarGrabacion(texto: string): string | null {
  const zona = texto.match(/Registros de la reuni[óo]n([\s\S]{0,400})/i);
  const donde = zona?.[1] ?? texto;

  const enlace = donde.match(/https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  return enlace?.[1] ?? null;
}

/**
 * Quién impartió, deducido de quién conduce el desglose.
 *
 * Las notas no traen un campo «instructor». Lo que sí traen es que casi todos
 * los puntos empiezan por la misma persona —«Irazu Romo Cortes explicó…»,
 * «Irazu Romo Cortes condujo…»—, porque es quien lleva la sesión. Se cuenta
 * quién aparece más veces al principio de un punto.
 *
 * Es una deducción, no un dato: por eso el formulario lo deja editable y quien
 * importa lo confirma.
 */
function sacarInstructor(texto: string): string | null {
  const cuenta = new Map<string, number>();

  /*
   * Se busca «Nombre Apellido <verbo de exposición>» en cualquier parte del
   * texto, no pegado al principio del punto.
   *
   * La primera versión exigía que el nombre viniera justo después de los dos
   * puntos del título, y con las notas reales no encontraba a nadie: entre el
   * guión del punto y el nombre está el título en negrita, de largo variable.
   * Buscar el patrón suelto acierta y no depende de cómo Gemini maquete.
   */
  const NOMBRE = "[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}";
  const VERBOS =
    "explic|present|detall|introdu|condu|gui[óo]|expus|expon|coordin|demostr|destac|realiz|" +
    "señal|indic|plante|concluy|comparti|mencion|defini|abord|dio inicio|invit|habl|imparti";

  const re = new RegExp(`(${NOMBRE})\\s+(?:${VERBOS})`, "g");

  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const nombre = m[1].trim();
    if (nombre.length < 5) continue;
    cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
  }

  if (cuenta.size === 0) return null;

  const [mejor, veces] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0];

  // Con una sola aparición no hay patrón: es alguien que habló una vez, no
  // quien lleva la sesión.
  return veces >= 2 ? mejor : null;
}

/** Cuánta gente fue. Sale de los correos de la lista de invitados. */
function contarAsistentes(texto: string): number {
  const zona = texto.match(/Invitado([\s\S]{0,6000}?)(?:Archivos adjuntos|Registros de la reuni|###)/i);
  if (!zona) return 0;

  const correos = zona[1].match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? [];
  return new Set(correos.map((c) => c.toLowerCase())).size;
}

/** ¿Es este el encabezado que busco? */
function esEncabezado(linea: string, nombre: string): boolean {
  const limpio = limpiarMarcas(linea).toLowerCase();
  return limpio === nombre.toLowerCase() || limpio === `${nombre.toLowerCase()}:`;
}

/** ¿Es un encabezado, el que sea? Marca dónde acaba un bloque. */
function esEncabezadoCualquiera(linea: string): boolean {
  if (!linea) return false;
  if (/^#{1,6}\s/.test(linea)) return true;
  // Gemini marca los encabezados en negrita y sin nada más en la línea.
  return /^\*\*[^*]+\*\*:?$/.test(linea.trim());
}

/** Fuera los asteriscos y los enlaces que el aplanado dejó pegados. */
function limpiarMarcas(s: string): string {
  return s
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/\s*<https?:\/\/[^>]*>/g, "")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\*/g, "*")
    .trim();
}
