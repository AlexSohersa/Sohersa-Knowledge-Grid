import "server-only";

import { getDriveClient } from "@/lib/google/client";
import { gridDb } from "@/lib/grid/db";
import { carpetaDe, CARPETA_MADRE } from "./subir-captura";

/**
 * Lleva las capturas del catálogo a la carpeta «FAQ Web».
 *
 * Las 51 imágenes de las fichas se importaron desde «IMAGENES EXTRAIDAS», la
 * carpeta de trabajo del área de Estandarización y Calidad. Ese era su sitio
 * mientras se preparaba el catálogo, pero no mientras la aplicación las sirve:
 *
 *   · La carpeta es de otra persona. El día que reorganice su Drive o cambie de
 *     puesto, las 51 fichas se quedan sin captura y nadie sabe por qué.
 *   · Ahí conviven con el Excel y los borradores del área, así que es fácil
 *     moverlas sin querer.
 *
 * Esto las COPIA a «FAQ Web» con la misma estructura que usa la aplicación al
 * subir una captura nueva, y apunta cada ficha a su copia. El original se queda
 * donde está: retirarlo es decisión del área, no nuestra.
 *
 * Corre con la cuenta de quien lo lanza desde Administración, así que solo
 * copia lo que esa persona ya puede ver.
 */

export interface ResultadoOrden {
  copiadas: number;
  yaEstaban: number;
  fallaron: number;
  detalles: string[];
}

export async function ordenarCapturas(): Promise<ResultadoOrden> {
  const drive = await getDriveClient();

  const fichas = await gridDb().faqEntry.findMany({
    where: { imageDriveId: { not: null } },
    select: {
      id: true,
      code: true,
      platform: true,
      category: true,
      imageDriveId: true,
      imageName: true,
    },
    orderBy: { code: "asc" },
  });

  const out: ResultadoOrden = { copiadas: 0, yaEstaban: 0, fallaron: 0, detalles: [] };

  for (const f of fichas) {
    try {
      /*
       * ¿Ya está donde debe? Se mira DÓNDE VIVE el archivo, no cómo se llama:
       * dos archivos pueden tener el mismo nombre en carpetas distintas, y lo
       * que decide es el padre.
       */
      const actual = await drive.files.get({
        fileId: f.imageDriveId!,
        fields: "parents,name",
        supportsAllDrives: true,
      });

      let padre = CARPETA_MADRE;
      if (f.platform) padre = await carpetaDe(drive, f.platform, padre);
      if (f.category) padre = await carpetaDe(drive, f.category, padre);

      if (actual.data.parents?.includes(padre)) {
        out.yaEstaban++;
        continue;
      }

      /*
       * Se COPIA, no se mueve.
       *
       * Mover sacaría la imagen de la carpeta del área sin avisarles, y ese
       * material es suyo. Con una copia, ellos conservan la suya y la
       * aplicación apunta a la nuestra, que vive donde no la va a tocar nadie.
       */
      const copia = await drive.files.copy({
        fileId: f.imageDriveId!,
        requestBody: {
          name: f.imageName ?? actual.data.name ?? undefined,
          parents: [padre],
        },
        fields: "id",
        supportsAllDrives: true,
      });

      const nuevoId = copia.data.id;
      if (!nuevoId) throw new Error("Drive no devolvió la copia.");

      await gridDb().faqEntry.update({
        where: { id: f.id },
        data: { imageDriveId: nuevoId },
      });

      out.copiadas++;
    } catch (e) {
      out.fallaron++;
      const motivo = e instanceof Error ? e.message : String(e);
      out.detalles.push(`${f.code}: ${motivo.slice(0, 80)}`);
    }
  }

  return out;
}
