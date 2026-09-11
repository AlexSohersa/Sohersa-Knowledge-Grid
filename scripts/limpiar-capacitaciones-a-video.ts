/**
 * Deja las capacitaciones importadas con SOLO el video.
 *
 * POR QUÉ SE DESHACE LO QUE SE ACABA DE CARGAR.
 *
 * Las notas de Gemini son un resumen automático de lo que se dijo en una
 * reunión. Sirven para una cosa —traen el enlace a la grabación— y para esa se
 * usaron. El error fue tratar el resto como si fuera contenido curado:
 *
 *   · Los «próximos pasos» de una reunión se guardaron como OBJETIVOS de la
 *     capacitación. No lo son: «Entregar hojas a Alba López» es un pendiente de
 *     ese día, no algo que la capacitación enseñe.
 *   · Cada punto del desglose se guardó como un TEMA con su descripción. Pero
 *     esos puntos los redactó un modelo escuchando la sesión, y la ficha los
 *     presentaba como si alguien los hubiera escrito para enseñar.
 *
 * Una ficha que promete «qué cubre» y lo llena con texto generado dice algo que
 * nadie ha verificado. Vale más un video sin descripción —que es honesto: ahí
 * está la sesión, míralo— que una descripción inventada.
 *
 * Así que queda un tema por capacitación, «Grabación de la sesión», con el
 * video y nada más. Lo que cubre cada una se escribirá cuando alguien lo
 * escriba de verdad.
 *
 *   CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/limpiar-capacitaciones-a-video.ts
 *
 * Es idempotente: correrlo dos veces deja lo mismo.
 */

import { Client } from "pg";

/** Las grabaciones, por código. Es lo único que se conserva de las notas. */
const GRABACIONES: Record<string, string> = {
  "CAP-001": "1x3x15U0QJCPfHc-kfFrXDIoWco0xix7z",
  "CAP-002": "1sO_qJJCKzgg1qazqBrVBLZu9G0huLaWa",
  "CAP-003": "1ywwHwvup1KID_nssLRVu0Bu6-V8yJiwQ",
};

/**
 * Los títulos, ya sin la coletilla de la reunión.
 *
 * «Capacitación Design Thinking» se lee mejor como «Design Thinking» en un
 * catálogo donde todo son capacitaciones, y «DISC - Tipos de personalidad -
 * Ale Cervantes Compucad» arrastra el nombre de quien la dio, que ya está en
 * su campo.
 */
const TITULOS: Record<string, string> = {
  "CAP-001": "DISC · Tipos de personalidad",
  "CAP-002": "Design Thinking",
  "CAP-003": "Inteligencia emocional",
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";
  console.log(`Limpiando capacitaciones sobre base ${destino}\n`);

  if (destino !== "LOCAL" && process.env.CONFIRMAR !== "si") {
    console.error('Repite con:\n  CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/limpiar-capacitaciones-a-video.ts');
    process.exit(1);
  }

  const c = new Client({ connectionString: url });
  await c.connect();

  try {
    /*
     * Nadie puede llevar avance sobre estos temas.
     *
     * Se comprueba antes de borrar: el progreso de las rutas cuelga del tema, y
     * rehacerlos con gente a medias les borraría lo hecho. Estas se cargaron
     * hace un rato y nadie las tiene asignadas, pero eso se verifica, no se
     * supone.
     */
    const avance = await c.query(
      `SELECT COUNT(*)::int n FROM "grid"."PathProgress"`,
    );
    if (avance.rows[0].n > 0) {
      console.error(
        `Hay ${avance.rows[0].n} avances registrados. No se toca nada: rehacer los\n` +
          "temas borraría el progreso de quien los lleve.",
      );
      process.exit(1);
    }

    const caps = await c.query(
      `SELECT id, "code", "title" FROM "grid"."Training"
        WHERE "code" = ANY($1) ORDER BY "code"`,
      [Object.keys(GRABACIONES)],
    );

    for (const cap of caps.rows) {
      const grabacion = GRABACIONES[cap.code];
      const titulo = TITULOS[cap.code] ?? cap.title;

      await c.query("BEGIN");

      /*
       * Fuera los objetivos Y el resumen.
       *
       * Los objetivos eran los pendientes de la reunión —«entregar las hojas a
       * Alba»—, así que sobran sin discusión. El resumen es más discutible: sí
       * describe la sesión. Pero lo redactó un modelo escuchándola, y en la
       * ficha se lee como si alguien del área lo hubiera escrito.
       *
       * El criterio es el mismo para los dos: en una ficha, un texto sin autor
       * no se distingue de uno verificado, y quien la lee no tiene forma de
       * saber cuál está viendo. Mejor vacío que de procedencia dudosa.
       */
      await c.query(
        `UPDATE "grid"."Training"
            SET "title" = $2, "objectives" = '{}', "summary" = NULL,
                "updatedAt" = NOW()
          WHERE id = $1`,
        [cap.id, titulo],
      );

      // Los temas se rehacen: uno solo, con el video.
      await c.query(`DELETE FROM "grid"."TrainingTopic" WHERE "trainingId" = $1`, [cap.id]);

      await c.query(
        `INSERT INTO "grid"."TrainingTopic"
           ("id","trainingId","code","title","summary","kind","position",
            "videoUrl","videoDriveId","videoPropio","updatedAt","createdAt")
         VALUES (gen_random_uuid()::text,$1,'01','Grabación de la sesión',NULL,'Video',0,
                 $2,$3,false,NOW(),NOW())`,
        [cap.id, `https://drive.google.com/file/d/${grabacion}/view`, grabacion],
      );

      await c.query("COMMIT");

      console.log(`  ${cap.code}  ${titulo}`);
      console.log(`           1 tema · el video · sin objetivos`);
    }

    const t = await c.query(`SELECT COUNT(*)::int n FROM "grid"."TrainingTopic"`);
    const o = await c.query(
      `SELECT COUNT(*)::int n FROM "grid"."Training" WHERE array_length("objectives",1) > 0`,
    );
    console.log(`\n  temas en total: ${t.rows[0].n}`);
    console.log(`  fichas con objetivos: ${o.rows[0].n}`);
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
