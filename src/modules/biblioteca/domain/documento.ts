// Módulo Biblioteca · DOMINIO · El documento y sus reglas.
//
// Lógica pura: no conoce Prisma, ni Next, ni de qué base salen los datos. Todo
// lo que hay aquí se puede probar con un objeto literal.

import { estiloExt, extDeArchivo } from "@/modules/shared/domain/conocimiento";

/**
 * Un documento de la biblioteca: manual, instructivo, estándar, plantilla o
 * familia.
 *
 * Los CAMPOS INTERNOS —prioridad, si es necesario para iniciar, las notas del
 * cronograma y el avance— son opcionales a propósito: solo llegan a quien puede
 * verlos. Que el tipo los declare opcionales obliga a comprobarlos antes de
 * usarlos, y así el compilador ayuda a no filtrarlos sin querer.
 */
export interface Documento {
  id: string;
  /** Numeración del cronograma: "1.1", "4.2". Es la llave visible. */
  code: string | null;
  title: string;
  section: string;

  fileName: string | null;
  driveId: string | null;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;

  author: string | null;
  /** Estado de la capacitación asociada: Pendiente · Agendada · Impartida. */
  training: string | null;
  origin: string;
  updatedAt: Date;

  /* Solo presentes para quien puede verlos. */
  priority?: string | null;
  required?: boolean;
  notes?: string | null;
  progress?: number | null;
}

/** Una sección del cronograma con sus documentos. */
export interface SeccionDocumentos {
  name: string;
  items: Documento[];
}

/**
 * El estado de elaboración de un documento.
 *
 * Sale de la prioridad del cronograma, donde "TERMINADO" es a la vez prioridad
 * y estado. Se traduce a algo que se pueda pintar sin que cada pantalla tenga
 * que interpretar la cadena original.
 */
export type EstadoDoc = "terminado" | "en_curso" | "pendiente";

export function estadoDocumento(doc: Documento): EstadoDoc {
  const p = (doc.priority ?? "").toUpperCase();
  if (p === "TERMINADO") return "terminado";
  // Un avance empezado pero no completo es "en curso" aunque la prioridad no lo
  // diga: el número es más fiable que la etiqueta, que se actualiza a mano.
  if (typeof doc.progress === "number" && doc.progress > 0 && doc.progress < 1) {
    return "en_curso";
  }
  if (typeof doc.progress === "number" && doc.progress >= 1) return "terminado";
  return "pendiente";
}

export function etiquetaEstado(estado: EstadoDoc): string {
  return { terminado: "Terminado", en_curso: "En curso", pendiente: "Pendiente" }[estado];
}

/** Colores del estado, del lenguaje visual del diseño. */
export function estiloEstado(estado: EstadoDoc): { soft: string; ink: string } {
  return {
    terminado: { soft: "#E4F8EB", ink: "#178A49" },
    en_curso: { soft: "#FDF3DC", ink: "#B07C10" },
    pendiente: { soft: "#EDF2F7", ink: "#718198" },
  }[estado];
}

/** La extensión que se muestra en la píldora del documento. */
export function extDocumento(doc: Documento): string {
  return extDeArchivo(doc.fileName, doc.mimeType);
}

/** Extensión y sus colores, resueltos de una vez. */
export function estiloDocumento(doc: Documento) {
  return estiloExt(extDocumento(doc));
}

/**
 * Cómo se abre un documento.
 *
 * `visor` cuando se puede incrustar y leer sin salir del Centro —lo preferible,
 * porque conserva el contexto—; `externo` cuando solo hay un enlace; `ninguno`
 * cuando la ficha existe pero el archivo todavía no.
 */
export type ModoApertura = "visor" | "externo" | "ninguno";

export function modoApertura(doc: Documento): ModoApertura {
  if (doc.driveId) return "visor";
  if (doc.url) return "externo";
  return "ninguno";
}

/**
 * La URL para incrustar un documento de Drive.
 *
 * `/preview` y no `/view`: la vista normal de Drive trae su propia barra y
 * botones que no encajan en el visor, y en un iframe intenta salirse del marco.
 */
export function urlPreviewDrive(driveId: string): string {
  return `https://drive.google.com/file/d/${driveId}/preview`;
}

/** La URL para descargar directamente un archivo de Drive. */
export function urlDescargaDrive(driveId: string): string {
  return `https://drive.google.com/uc?export=download&id=${driveId}`;
}

/**
 * El número de sección que ordena el cronograma.
 *
 * Las secciones salen en el orden de la hoja —por el número de su primer
 * documento— y no alfabético, para que la biblioteca se lea igual que el
 * cronograma que el equipo ya conoce.
 */
export function ordenSeccion(seccion: SeccionDocumentos): number {
  return Number(seccion.items[0]?.code?.split(".")[0] ?? 999);
}

/**
 * Si un documento coincide con lo que se busca.
 *
 * Busca en título, código, sección, autor y nombre de archivo: son los cinco
 * campos por los que la gente recuerda un documento. Sin acentos y en
 * minúsculas, porque nadie escribe "cuantificación" con tilde en un buscador.
 */
export function coincide(doc: Documento, consulta: string): boolean {
  const q = normalizar(consulta);
  if (!q) return true;
  const heno = normalizar(
    [doc.title, doc.code, doc.section, doc.author, doc.fileName].filter(Boolean).join(" "),
  );
  // Todas las palabras deben aparecer: buscar "revit revisiones" debe encontrar
  // el instructivo aunque las palabras estén separadas en el título.
  return q.split(/\s+/).every((palabra) => heno.includes(palabra));
}

/**
 * Minúsculas y sin acentos, para comparar como escribe la gente.
 *
 * `NFD` separa la letra de su tilde y el rango `\u0300-\u036f` —los signos
 * diacríticos combinables— la borra. Así "cuantificación" y "cuantificacion"
 * son la misma cadena al buscar.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
