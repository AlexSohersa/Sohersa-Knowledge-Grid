// Módulo CAPACITACIONES · INFRAESTRUCTURA · Importar desde unas notas.
//
// Une las tres piezas: leer el documento de notas, dejar el material en la
// carpeta del Centro, y guardar la ficha.
//
// EL ORDEN IMPORTA, y no es el obvio. Primero se lee, después se guarda la
// ficha, y solo al final se copia el video:
//
//   · Leer primero permite fallar antes de tocar nada cuando el documento no
//     se puede abrir, que es el caso más común.
//   · Guardar la ficha antes de copiar deja algo utilizable aunque la copia
//     falle —un video de 300 MB puede agotar el tiempo—, y el video se puede
//     reintentar después sobre una ficha que ya existe.
//
// Al revés —copiar primero— un fallo al guardar dejaría el archivo copiado sin
// ficha que lo reclame, y nadie sabría que está ahí.

import "server-only";

import { gridDb } from "@/lib/grid/db";
import { getDriveClient } from "@/lib/google/client";
import { leerNotasGemini, NotasError, type NotasLeidas } from "./leer-notas-gemini";
import {
  copiarArchivo,
  idDesdeEnlace,
  nombreCarpeta,
  prepararCarpeta,
  CARPETA_CAPACITACIONES,
} from "./carpeta-drive";

export { NotasError };

/** Lo que se propone importar, antes de guardarlo. */
export interface Propuesta extends NotasLeidas {
  /** El código que le tocaría: «CAP-007». */
  codigo: string;
  /** El documento del que salió. */
  notasDocId: string;
  /** `true` si ya hay una ficha importada de este mismo documento. */
  yaImportada: boolean;
  /** El id de la ficha existente, cuando la hay. */
  existenteId: string | null;
}

/**
 * El siguiente código libre de la serie: CAP-001, CAP-002…
 *
 * Se mira el MAYOR que haya, no cuántas hay: si alguna se borró, contar daría
 * un código ya usado y el índice único lo rechazaría. Mismo criterio que las
 * fichas del FAQ.
 */
export async function siguienteCodigo(): Promise<string> {
  const filas = await gridDb()
    .training.findMany({
      where: { code: { startsWith: "CAP-" } },
      select: { code: true },
    })
    .catch(() => [] as { code: string | null }[]);

  let mayor = 0;
  for (const f of filas) {
    const n = Number(f.code?.slice(4));
    if (Number.isFinite(n) && n > mayor) mayor = n;
  }

  return `CAP-${String(mayor + 1).padStart(3, "0")}`;
}

/**
 * Lee unas notas y propone la ficha, SIN guardar nada.
 *
 * Separado de `importar` a propósito: quien importa ve antes lo que se va a
 * crear y puede corregir el título, el instructor o los temas. Lo que sale de
 * un documento generado automáticamente merece una revisión humana antes de
 * quedar publicado.
 */
export async function proponerDesdeNotas(enlace: string): Promise<Propuesta> {
  const notas = await leerNotasGemini(enlace);

  const docId = idDesdeEnlace(enlace);
  if (!docId) throw new NotasError("No se reconoció el enlace del documento.");

  // ¿Ya se importó este mismo documento? Evita duplicados al reintentar.
  const existente = await gridDb()
    .training.findFirst({
      where: { notasDocId: docId },
      select: { id: true, code: true },
    })
    .catch(() => null);

  return {
    ...notas,
    codigo: existente?.code ?? (await siguienteCodigo()),
    notasDocId: docId,
    yaImportada: Boolean(existente),
    existenteId: existente?.id ?? null,
  };
}

/** Lo que hay que decidir antes de guardar. */
export interface AjustesImportacion {
  titulo: string;
  resumen: string | null;
  instructor: string | null;
  categoria: string | null;
  nivel: string;
  /** Si se copia el video a la carpeta del Centro o se deja donde está. */
  copiarVideo: boolean;
  /** Si queda publicada de inmediato o en borrador para revisarla. */
  publicar: boolean;
}

export interface ResultadoImportacion {
  capacitacionId: string;
  codigo: string;
  carpetaId: string;
  temas: number;
  videoCopiado: boolean;
  /** Lo que no salió, sin que fuera motivo para abortar. */
  avisos: string[];
}

/**
 * Guarda la capacitación y deja su material en la carpeta del Centro.
 *
 * Corre con la cuenta de QUIEN IMPORTA. Eso es lo que hace que todo esto
 * funcione sin tocar los permisos de nadie: copiar un archivo solo exige poder
 * verlo, y la copia pertenece a quien copia. El Centro acaba siendo dueño de
 * su material sin pedirle nada a quien lo grabó.
 */
export async function importarCapacitacion(
  propuesta: Propuesta,
  ajustes: AjustesImportacion,
  importadaPor: string,
): Promise<ResultadoImportacion> {
  const avisos: string[] = [];
  const codigo = propuesta.codigo;

  /*
   * 1 · La carpeta, antes que la ficha.
   *
   * Si Drive no deja crearla —sin permiso, sin conexión—, mejor saberlo ahora
   * que después de haber guardado una ficha que apunta a un sitio inexistente.
   */
  let carpetaId: string;
  try {
    carpetaId = await prepararCarpeta(codigo, ajustes.titulo);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    throw new NotasError(
      `No se pudo preparar la carpeta en Drive: ${motivo}. ` +
        `Comprueba que tienes acceso de edición a «Capacitaciones Centro de Conocimiento».`,
    );
  }

  // 2 · La ficha.

  const datos = {
    code: codigo,
    title: ajustes.titulo,
    summary: ajustes.resumen,
    /*
     * Los objetivos NO salen de las notas.
     *
     * Los «próximos pasos» de Gemini son los pendientes de esa reunión
     * —«entregar las hojas a Alba»—, no lo que la capacitación enseña. Se
     * probó ponerlos y la ficha acababa prometiendo cosas que nadie decidió.
     *
     * Quedan vacíos: los escribe quien conozca la capacitación, editando.
     */
    objectives: [],
    instructor: ajustes.instructor,
    category: ajustes.categoria,
    level: ajustes.nivel,
    status: ajustes.publicar ? "PUBLICADA" : "BORRADOR",
    driveFolderId: carpetaId,
    notasDocId: propuesta.notasDocId,
    impartidaEn: propuesta.fecha,
    asistentes: propuesta.asistentes,
    /*
     * Sin duración.
     *
     * Se estimaba a diez minutos por punto del desglose, y eso daba «~3 h 10
     * min» con un aire de dato medido que no tenía: salía de contar párrafos.
     * La duración real la sabe quien vea el video, y se pone editando.
     */
    durationMin: 0,
    duration: null,
    period: propuesta.fecha ? `${propuesta.fecha.getFullYear()}` : null,
  };

  const cap = propuesta.existenteId
    ? await gridDb().training.update({
        where: { id: propuesta.existenteId },
        data: datos,
        select: { id: true },
      })
    : await gridDb().training.create({
        data: { ...datos, createdBy: importadaPor },
        select: { id: true },
      });

  /*
   * 3 · Los temas.
   *
   * Al reimportar se reemplazan enteros en vez de intentar casarlos uno a uno:
   * las notas son la fuente, y un desglose a medias —unos temas viejos, otros
   * nuevos— sería peor que cualquiera de los dos completos.
   *
   * El progreso de las rutas cuelga de `PathProgress`, que apunta al tema. Por
   * eso solo se borran cuando NADIE lleva avance sobre ellos: reemplazar temas
   * con gente a medias les borraría lo hecho.
   */
  if (propuesta.existenteId) {
    const conAvance = await gridDb()
      .pathProgress.count({
        where: { topic: { trainingId: cap.id } },
      })
      .catch(() => 0);

    if (conAvance === 0) {
      await gridDb().trainingTopic.deleteMany({ where: { trainingId: cap.id } });
    } else {
      avisos.push(
        `Los temas no se reemplazaron: ${conAvance} ${conAvance === 1 ? "persona lleva" : "personas llevan"} avance registrado sobre ellos.`,
      );
    }
  }

  const hayTemas = await gridDb()
    .trainingTopic.count({ where: { trainingId: cap.id } })
    .catch(() => 0);

  /*
   * UN SOLO TEMA: la grabación.
   *
   * Antes se creaba un tema por cada punto del desglose de las notas, con su
   * descripción. Esos puntos los redactó un modelo escuchando la reunión, y en
   * la ficha se leían como si alguien los hubiera escrito para enseñar. Un
   * temario de diecinueve puntos que nadie revisó aparenta un trabajo de
   * preparación que no existe.
   *
   * Lo que de verdad hay es una grabación. Eso es lo que se guarda, sin
   * descripción: quien quiera saber de qué va, la ve. Si más adelante alguien
   * desglosa la sesión de verdad, se añaden los temas desde la edición.
   */
  let creados = 0;
  if (hayTemas === 0) {
    await gridDb().trainingTopic.create({
      data: {
        trainingId: cap.id,
        code: "01",
        title: "Grabación de la sesión",
        kind: "Video",
        position: 0,
      },
    });
    creados = 1;
  }

  /*
   * 4 · El video, al final.
   *
   * Es lo más pesado y lo más propenso a fallar, así que va cuando todo lo
   * demás ya está guardado: si falla, queda una ficha completa a la que solo
   * le falta el video, y se puede reintentar.
   */
  let videoCopiado = false;

  if (propuesta.grabacionId) {
    const enlaceOriginal = `https://drive.google.com/file/d/${propuesta.grabacionId}/view`;

    let idVideo = propuesta.grabacionId;
    let propio = false;

    if (ajustes.copiarVideo) {
      try {
        const copia = await copiarArchivo(
          propuesta.grabacionId,
          codigo,
          ajustes.titulo,
          "video",
          `${codigo} ${ajustes.titulo}.mp4`,
        );
        idVideo = copia.driveId;
        propio = true;
        videoCopiado = !copia.yaEstaba;
      } catch (e) {
        /*
         * Que no se pueda copiar NO es motivo para perder la importación.
         *
         * Pasa cuando quien grabó deshabilitó la copia, y es justo el caso en
         * que más útil resulta quedarse con el enlace: la ficha funciona igual,
         * solo que el video sigue viviendo en el Drive de esa persona.
         */
        const motivo = e instanceof Error ? e.message : String(e);
        avisos.push(
          `El video no se pudo copiar (${motivo.slice(0, 120)}). Queda enlazado donde está.`,
        );
      }
    }

    const primero = await gridDb()
      .trainingTopic.findFirst({
        where: { trainingId: cap.id },
        orderBy: { position: "asc" },
        select: { id: true },
      })
      .catch(() => null);

    if (primero) {
      await gridDb().trainingTopic.update({
        where: { id: primero.id },
        data: {
          videoUrl: propio ? `https://drive.google.com/file/d/${idVideo}/view` : enlaceOriginal,
          videoDriveId: idVideo,
          videoPropio: propio,
        },
      });
    } else {
      avisos.push("No se creó ningún tema, así que el video quedó sin dónde colgarse.");
    }
  } else {
    avisos.push("Las notas no enlazaban ninguna grabación.");
  }

  // 5 · Las notas, copiadas también: son parte del material.
  try {
    await copiarArchivo(
      propuesta.notasDocId,
      codigo,
      ajustes.titulo,
      "notas",
      `${codigo} Notas de la sesión`,
    );
  } catch {
    // Las notas son secundarias: la ficha ya las lleva dentro. Si Drive no deja
    // copiarlas, no merece contarlo como fallo.
  }

  return {
    capacitacionId: cap.id,
    codigo,
    carpetaId,
    temas: creados,
    videoCopiado,
    avisos,
  };
}


/** El enlace a la carpeta del Centro, para enseñarlo al terminar. */
export function enlaceCarpeta(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

/** El enlace a la carpeta madre, la de todas las capacitaciones. */
export const ENLACE_CARPETA_MADRE = enlaceCarpeta(CARPETA_CAPACITACIONES);

/**
 * Renombra la carpeta cuando la capacitación cambia de título.
 *
 * Sin esto, la carpeta seguiría llamándose como el título viejo y en unos
 * meses nadie sabría a qué corresponde. Se llama al editar, y si falla no
 * impide guardar: el nombre de una carpeta no vale una edición perdida.
 */
export async function renombrarCarpeta(
  carpetaId: string,
  codigo: string | null,
  tituloNuevo: string,
): Promise<boolean> {
  try {
    const drive = await getDriveClient();
    await drive.files.update({
      fileId: carpetaId,
      requestBody: { name: nombreCarpeta(codigo, tituloNuevo) },
      supportsAllDrives: true,
    });
    return true;
  } catch {
    return false;
  }
}
