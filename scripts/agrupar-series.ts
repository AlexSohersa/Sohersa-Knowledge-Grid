/**
 * Junta las capacitaciones que son sesiones de lo mismo.
 *
 * El catálogo tenía tres entradas de Power BI, tres de Georreferenciación y dos
 * de Dynamo compitiendo entre sí, cuando en realidad cada grupo es UNA
 * capacitación impartida en varias sesiones. Quien buscaba «Power BI» veía tres
 * fichas y no sabía por cuál empezar.
 *
 * NO HACE FALTA INVENTAR NADA para arreglarlo: una capacitación ya tiene temas
 * dentro, en orden y con su video cada uno. Una serie de tres sesiones es
 * exactamente eso. Lo que se hace aquí es mover los temas de las sesiones
 * sueltas a la ficha que las agrupa, y retirar las fichas que sobran.
 *
 * QUÉ SE CONSERVA de cada sesión al mudarla:
 *   · Su video, que es lo único irrepetible.
 *   · Su instructor y su fecha, que pasan al título del tema cuando difieren de
 *     los de la ficha: en una serie puede cambiar quién imparte.
 *   · Sus materiales, que viajan con el tema.
 *
 * SE COMPRUEBA ANTES DE BORRAR que nadie lleve avance sobre esas fichas: el
 * progreso de una ruta cuelga del tema, y mudar temas con gente a medias les
 * borraría lo hecho. Si hay alguien, no se toca nada.
 *
 *   SOLO_LEER=si npx tsx scripts/agrupar-series.ts
 *   CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/agrupar-series.ts
 */

import { Client } from "pg";

interface Serie {
  /** La ficha que se queda y agrupa a las demás. */
  principal: string;
  /** Cómo se llamará la capacitación agrupada. */
  titulo: string;
  /** Una descripción que ya hable de la serie entera, no de una sesión. */
  descripcion: string;
  /** Las sesiones, EN ORDEN. La primera es la de la ficha principal. */
  sesiones: { code: string; nombre: string }[];
}

const SERIES: Serie[] = [
  {
    principal: "CAP-010",
    titulo: "Power BI para proyectos",
    descripcion:
      "Serie de tres sesiones sobre inteligencia de negocios aplicada a proyectos. " +
      "Empieza por Autodesk Insight y los fundamentos —el modelo BIM tratado como " +
      "base de datos, extracción y carga de información—, sigue con la construcción " +
      "de tableros en Power BI, y cierra con Autodesk Data Connector armando un " +
      "panel completo sobre un caso real de errores detectados en obra.",
    sesiones: [
      { code: "CAP-010", nombre: "Sesión 1 · Autodesk Insight y fundamentos de BI" },
      { code: "CAP-012", nombre: "Sesión 2 · Tableros en Power BI" },
      { code: "CAP-013", nombre: "Sesión 3 · Autodesk Data Connector" },
    ],
  },
  {
    principal: "CAP-011",
    titulo: "Georreferenciación",
    descripcion:
      "Serie de tres sesiones sobre cómo ubicar un modelo BIM en sus coordenadas " +
      "reales: qué sistema de referencia usar, y por qué el punto base y el punto de " +
      "reconocimiento deciden que todo encaje al vincular modelos de distintas " +
      "disciplinas.",
    sesiones: [
      { code: "CAP-011", nombre: "Sesión 1" },
      { code: "CAP-014", nombre: "Sesión 2" },
      { code: "CAP-015", nombre: "Sesión 3" },
    ],
  },
  {
    principal: "CAP-016",
    titulo: "Dynamo",
    descripcion:
      "Serie de dos sesiones sobre programación visual dentro de Revit para " +
      "automatizar tareas repetitivas. De los fundamentos —qué es un nodo, cómo se " +
      "conectan— a scripts más elaborados con manejo de listas y lectura y escritura " +
      "de parámetros del modelo.",
    sesiones: [
      { code: "CAP-016", nombre: "Sesión 1 · Fundamentos" },
      { code: "CAP-017", nombre: "Sesión 2 · Listas y parámetros" },
    ],
  },
];

async function main() {
  if (process.env.SOLO_LEER === "si") {
    console.log("=== lo que quedaría ===\n");
    for (const s of SERIES) {
      console.log(`  ${s.principal}  ${s.titulo}`);
      for (const [i, x] of s.sesiones.entries()) {
        const marca = x.code === s.principal ? "se queda" : "se funde y se retira";
        console.log(`      ${String(i + 1).padStart(2, "0")}  ${x.nombre.padEnd(46)} ← ${x.code} (${marca})`);
      }
      console.log();
    }
    const retiradas = SERIES.reduce((n, s) => n + s.sesiones.length - 1, 0);
    console.log(`  fichas retiradas: ${retiradas}   ·   el catálogo pasa de 17 a ${17 - retiradas}`);
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";
  console.log(`Agrupando series sobre base ${destino}\n`);

  if (destino !== "LOCAL" && process.env.CONFIRMAR !== "si") {
    console.error('Repite con:\n  CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/agrupar-series.ts');
    process.exit(1);
  }

  const c = new Client({ connectionString: url });
  await c.connect();

  try {
    const aRetirar = SERIES.flatMap((s) =>
      s.sesiones.filter((x) => x.code !== s.principal).map((x) => x.code),
    );

    /*
     * Nadie puede llevar avance sobre lo que se va a mover.
     *
     * El progreso de una ruta apunta al TEMA. Mudar temas de una ficha a otra
     * no lo rompe —el tema conserva su id—, pero borrar la ficha vieja sí
     * arrastraría lo que colgara de ella. Se comprueba y, si hay alguien, no se
     * toca nada: es preferible dejar el catálogo desordenado a borrarle el
     * avance a una persona.
     */
    const avance = await c.query(
      `SELECT COUNT(*)::int n FROM "grid"."PathProgress" p
         JOIN "grid"."TrainingTopic" x ON x.id = p."topicId"
         JOIN "grid"."Training" t ON t.id = x."trainingId"
        WHERE t."code" = ANY($1)`,
      [aRetirar],
    );

    if (avance.rows[0].n > 0) {
      console.error(
        `Hay ${avance.rows[0].n} avances sobre las fichas que se iban a retirar.\n` +
          "No se toca nada: fusionarlas les borraría el progreso.",
      );
      process.exit(1);
    }

    for (const s of SERIES) {
      await c.query("BEGIN");

      const pr = await c.query(`SELECT id FROM "grid"."Training" WHERE "code" = $1`, [s.principal]);
      if (!pr.rowCount) {
        await c.query("ROLLBACK");
        console.log(`  !! ${s.principal} no existe, se salta`);
        continue;
      }
      const idPrincipal = pr.rows[0].id;

      /*
       * La fecha más reciente se lee AHORA, antes de borrar nada.
       *
       * Se leía después, y para entonces las fichas de las otras sesiones ya no
       * existían: la consulta solo veía la principal y devolvía su propia
       * fecha, que es la de la PRIMERA sesión. En un catálogo ordenado de lo
       * nuevo a lo viejo, eso hundía la serie entera.
       */
      const fechas = await c.query(
        `SELECT MAX("impartidaEn") f FROM "grid"."Training" WHERE "code" = ANY($1)`,
        [s.sesiones.map((x) => x.code)],
      );
      const fechaSerie = fechas.rows[0].f;

      console.log(`  ${s.principal}  ${s.titulo}`);

      for (const [i, ses] of s.sesiones.entries()) {
        const codigo = String(i + 1).padStart(2, "0");

        const f = await c.query(
          `SELECT id, "instructor", "impartidaEn"::date fecha FROM "grid"."Training" WHERE "code" = $1`,
          [ses.code],
        );
        if (!f.rowCount) {
          console.log(`      -- ${ses.code} no existe`);
          continue;
        }

        const { id: idOrigen, instructor, fecha } = f.rows[0];

        /*
         * El título del tema lleva quién y cuándo, si se sabe.
         *
         * En una serie puede cambiar el instructor entre sesiones, y la ficha
         * agrupada solo puede mostrar uno. Ponerlo en el tema es lo que evita
         * perder ese dato al fusionar.
         */
        const extra = [
          instructor,
          fecha
            ? fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

        const titulo = extra ? `${ses.nombre} — ${extra}` : ses.nombre;

        // Los temas de esa sesión se mudan a la ficha principal, renumerados.
        await c.query(
          `UPDATE "grid"."TrainingTopic"
              SET "trainingId" = $1, "code" = $2, "title" = $3, "position" = $4,
                  "updatedAt" = NOW()
            WHERE "trainingId" = $5`,
          [idPrincipal, codigo, titulo, i, idOrigen],
        );

        console.log(`      ${codigo}  ${titulo}`);

        // La ficha sobrante se va, ya sin temas que arrastrar.
        if (ses.code !== s.principal) {
          await c.query(`DELETE FROM "grid"."Training" WHERE id = $1`, [idOrigen]);
        }
      }

      /*
       * La ficha agrupada toma el título y la descripción de la serie, y la
       * fecha de la sesión MÁS RECIENTE: en el catálogo, ordenado de lo nuevo a
       * lo viejo, una serie vale por cuándo se dio por última vez.
       */
      await c.query(
        `UPDATE "grid"."Training"
            SET "title" = $2, "summary" = $3, "impartidaEn" = COALESCE($4, "impartidaEn"),
                "updatedAt" = NOW()
          WHERE "code" = $1`,
        [s.principal, s.titulo, s.descripcion, fechaSerie],
      );

      await c.query("COMMIT");
      console.log();
    }

    const q = await c.query(`SELECT COUNT(*)::int n FROM "grid"."Training"`);
    console.log(`  capacitaciones en el catálogo: ${q.rows[0].n}`);
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
