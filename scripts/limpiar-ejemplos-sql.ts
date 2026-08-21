/**
 * La misma limpieza que `limpiar-ejemplos.ts`, pero hablando SQL directo.
 *
 * Existe por una razón de red, no de diseño: desde esta máquina el motor de
 * Prisma no alcanza el servidor de Neon —ni por el pooler ni por el endpoint
 * directo—, mientras que `pg` conecta sin problema. Como el borrado hay que
 * hacerlo una sola vez y desde aquí, se usa el cliente que sí llega.
 *
 * Mantiene las mismas garantías que su gemelo:
 *   · pide `CONFIRMAR=si` para tocar una base remota;
 *   · va en UNA transacción: o se aplica todo, o no se aplica nada;
 *   · cuenta antes y después, y ABORTA —deshaciendo— si tocó algo que debía
 *     conservarse.
 *
 * Lo que se CONSERVA: la biblioteca, las capacitaciones con sus temas y
 * materiales, las automatizaciones, el `SyncLog` y los administradores.
 *
 * Lo que se BORRA: herramientas, rutas, FAQ, comunidad, y lo personal que
 * apuntaba a ellas.
 *
 *   CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/limpiar-ejemplos-sql.ts
 */

import { Client } from "pg";

/** Las tablas que se vacían, de las hojas hacia la raíz. */
const PASOS: Array<[string, string]> = [
  /*
   * Las rutas primero, y por dentro hacia fuera.
   *
   * `PathItem."trainingId"` es `ON DELETE SET NULL`, así que vaciar los
   * elementos de una etapa NO arrastra las capacitaciones que referencian:
   * solo desaparece el vínculo. Es justo lo que hace falta.
   */
  ["avances de ruta", `DELETE FROM "grid"."PathProgress"`],
  ["asignaciones de ruta", `DELETE FROM "grid"."PathAssignment"`],
  ["elementos de etapa", `DELETE FROM "grid"."PathItem"`],
  ["etapas", `DELETE FROM "grid"."PathStage"`],
  ["rutas", `DELETE FROM "grid"."LearningPath"`],

  ["votos de FAQ", `DELETE FROM "grid"."FaqVote"`],
  ["preguntas frecuentes", `DELETE FROM "grid"."FaqEntry"`],

  ["comentarios de respuesta", `DELETE FROM "grid"."AnswerComment"`],
  ["votos de respuesta", `DELETE FROM "grid"."AnswerVote"`],
  ["respuestas", `DELETE FROM "grid"."Answer"`],
  ["preguntas de la comunidad", `DELETE FROM "grid"."Question"`],

  ["herramientas", `DELETE FROM "grid"."Tool"`],

  /*
   * Lo personal apunta a su contenido por código, no por clave foránea, así
   * que nada lo limpiaría solo. Se conserva lo que señala a algo que sigue
   * existiendo (`cap`, `doc`) y se tira lo que quedaría como tarjeta rota.
   */
  ["guardados de contenido borrado", `DELETE FROM "grid"."Bookmark" WHERE "kind" NOT IN ('cap','doc')`],
  ["historial de contenido borrado", `DELETE FROM "grid"."ViewLog" WHERE "kind" NOT IN ('cap','doc')`],
];

/** Lo que NO debe cambiar. */
const CONSERVAR: Array<[string, string]> = [
  ["biblioteca", `"grid"."Resource"`],
  ["capacitaciones", `"grid"."Training"`],
  ["temas", `"grid"."TrainingTopic"`],
  ["materiales", `"grid"."TrainingMaterial"`],
  ["automatizaciones", `"grid"."Automation"`],
  ["administradores", `"grid"."GridAdmin"`],
];

async function contar(c: Client): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const [nombre, tabla] of CONSERVAR) {
    const r = await c.query(`SELECT count(*)::int n FROM ${tabla}`);
    out[nombre] = r.rows[0].n;
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";
  console.log(`Base ${destino}\n  ${url.replace(/:[^:@]+@/, ":****@")}\n`);

  if (destino !== "LOCAL" && !process.env.CONFIRMAR) {
    console.error(
      "Esta base NO es local. Si de verdad quieres limpiarla, repite con:\n" +
        '  CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/limpiar-ejemplos-sql.ts',
    );
    process.exit(1);
  }

  /*
   * SSL solo cuando hace falta: Neon lo exige, y el Postgres local ni siquiera
   * lo tiene compilado —pedirlo ahí aborta la conexión con "the server does
   * not support SSL connections"—.
   */
  const remota = destino !== "LOCAL";
  const c = new Client({
    connectionString: url,
    ssl: remota ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();

  const antes = await contar(c);

  /*
   * Todo dentro de una transacción.
   *
   * Si la comprobación final descubre que se tocó algo que debía conservarse,
   * un `ROLLBACK` devuelve la base al estado exacto de antes. En producción,
   * poder deshacer vale más que la velocidad.
   */
  await c.query("BEGIN");

  try {
    console.log("Borrando los datos de ejemplo…\n");

    let total = 0;
    for (const [nombre, sql] of PASOS) {
      const r = await c.query(sql);
      total += r.rowCount ?? 0;
      if (r.rowCount) console.log(`  ${String(r.rowCount).padStart(5)}  ${nombre}`);
    }

    const despues = await contar(c);

    const dañado = CONSERVAR.filter(([n]) => antes[n] !== despues[n]);
    if (dañado.length > 0) {
      await c.query("ROLLBACK");
      console.error("\nSe deshizo todo: el borrado tocó algo que debía conservarse.");
      for (const [n] of dañado) console.error(`  ${n}: de ${antes[n]} a ${despues[n]}`);
      process.exit(1);
    }

    await c.query("COMMIT");

    console.log(`\n  ${total} filas borradas.\n`);
    console.log("Lo que queda intacto:");
    for (const [n] of CONSERVAR) console.log(`  ${String(despues[n]).padStart(5)}  ${n}`);
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("Falló la limpieza:", e.message);
  process.exit(1);
});
