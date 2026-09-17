// Módulo HERRAMIENTAS · DOMINIO · De dónde se descarga cada cosa.
//
// Una herramienta puede traer su archivo, y quien entra lo descarga de ahí.
// Ese archivo llega de dos maneras y hay que tratarlas distinto:
//
//   · Vive en Drive. Es el caso normal: alguien sube un `.dyn` o una plantilla
//     y pega el enlace. Drive usa una dirección para VER y otra para
//     DESCARGAR, así que hay que construir la segunda.
//   · Es una dirección externa. La página de descarga de un fabricante, un
//     instalador. Se deja tal cual: quien la puso sabe a dónde lleva.

/** El id de Drive que hay dentro de un enlace, sea de la forma que sea. */
export function idDriveDe(enlace: string): string | null {
  const s = enlace.trim();
  if (!s) return null;

  // Un id pegado a secas, sin enlace alrededor.
  if (/^[A-Za-z0-9_-]{25,}$/.test(s)) return s;

  if (!/drive\.google\.com|docs\.google\.com/i.test(s)) return null;

  const patrones = [
    /\/file\/d\/([A-Za-z0-9_-]+)/,
    /\/document\/d\/([A-Za-z0-9_-]+)/,
    /\/presentation\/d\/([A-Za-z0-9_-]+)/,
    /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/,
    /[?&]id=([A-Za-z0-9_-]+)/,
  ];

  for (const p of patrones) {
    const m = s.match(p);
    if (m?.[1]) return m[1];
  }

  return null;
}

/**
 * La dirección que DESCARGA el archivo, no la que lo enseña.
 *
 * Esto es lo que hace que baste con pulsar un botón. El enlace que se copia de
 * Drive abre el visor —una pestaña con una vista previa y un menú—, y desde ahí
 * todavía hay que buscar «Descargar». `uc?export=download` se salta ese paso y
 * entrega el archivo directamente.
 *
 * Con archivos grandes Drive intercala una página de aviso sobre el antivirus;
 * `confirm=t` la salta. Es el mismo parámetro que usa el propio Drive cuando se
 * pulsa «descargar de todos modos».
 */
export function enlaceDeDescarga(
  driveFileId: string | null | undefined,
  downloadUrl: string | null | undefined,
): string | null {
  if (driveFileId) {
    return `https://drive.google.com/uc?export=download&id=${driveFileId}&confirm=t`;
  }
  return downloadUrl?.trim() || null;
}

/**
 * La dirección para VER el archivo sin descargarlo.
 *
 * Hace falta junto a la de descarga: antes de bajarse un `.zip` de 40 MB,
 * conviene poder asomarse. Solo existe para lo que vive en Drive; una
 * dirección externa es la que es.
 */
export function enlaceDeVista(
  driveFileId: string | null | undefined,
  downloadUrl: string | null | undefined,
): string | null {
  if (driveFileId) return `https://drive.google.com/file/d/${driveFileId}/view`;
  return downloadUrl?.trim() || null;
}

/** ¿Esta herramienta trae algo que descargar? */
export function esDescargable(t: {
  downloadUrl?: string | null;
  driveFileId?: string | null;
}): boolean {
  return Boolean(t.driveFileId || t.downloadUrl?.trim());
}

/**
 * La extensión, para el sello de color de la fila.
 *
 * Se saca del nombre del archivo y no del enlace: un enlace de Drive no dice
 * qué hay al otro lado, y el nombre sí.
 */
export function extensionDe(fileName: string | null | undefined): string {
  const ext = (fileName ?? "").toLowerCase().split(".").pop() ?? "";
  if (!ext || ext === fileName?.toLowerCase()) return "";
  return ext.slice(0, 5);
}

/** El color de cada clase de archivo, para reconocerla de un vistazo. */
export function estiloArchivo(fileName: string | null | undefined): {
  soft: string;
  ink: string;
  ext: string;
} {
  const ext = extensionDe(fileName);

  const POR_TIPO: Record<string, { soft: string; ink: string }> = {
    dyn: { soft: "#EFE9FE", ink: "#6D4FD6" },
    dynx: { soft: "#EFE9FE", ink: "#6D4FD6" },
    rvt: { soft: "#E4F1FB", ink: "#2E6C99" },
    rfa: { soft: "#E4F1FB", ink: "#2E6C99" },
    rte: { soft: "#E4F1FB", ink: "#2E6C99" },
    pdf: { soft: "#FCE9EA", ink: "#C23840" },
    zip: { soft: "#FDF3DC", ink: "#B07C10" },
    rar: { soft: "#FDF3DC", ink: "#B07C10" },
    xlsx: { soft: "#E4F8EB", ink: "#178A49" },
    xls: { soft: "#E4F8EB", ink: "#178A49" },
    csv: { soft: "#E4F8EB", ink: "#178A49" },
    docx: { soft: "#E4F1FB", ink: "#2E6C99" },
    pbix: { soft: "#FDF3DC", ink: "#B07C10" },
    exe: { soft: "#EDF2F7", ink: "#718198" },
    msi: { soft: "#EDF2F7", ink: "#718198" },
  };

  return {
    ...(POR_TIPO[ext] ?? { soft: "#EDF2F7", ink: "#718198" }),
    ext: ext.toUpperCase() || "LINK",
  };
}

/** «2.4 MB», a partir de los bytes. */
export function tamanoLegible(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
