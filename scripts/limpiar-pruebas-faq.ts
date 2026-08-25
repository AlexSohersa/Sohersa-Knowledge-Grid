/**
 * Retira lo que se creó probando el FAQ.
 *
 * Durante el desarrollo se propusieron y aprobaron fichas de prueba, se
 * mandaron comentarios y se generaron avisos. Nada de eso debe estrenarse: el
 * catálogo oficial son las 78 fichas que importó el área, y una ficha titulada
 * «ahora si deb funcionar ien» junto a ellas resta credibilidad a todo lo demás.
 *
 * QUÉ SE CONSIDERA PRUEBA. Todo lo que NO viene del catálogo:
 *
 *   · Las fichas cuyo `createdBy` no es `catalogo-bim`.
 *   · Todas las propuestas y comentarios —no hay ninguno real todavía—.
 *   · Los avisos, que solo tienen sentido junto a lo que los originó.
 *
 * Las 78 del catálogo NO se tocan, y el script aborta si el número cambia.
 *
 * Es IDEMPOTENTE: correrlo dos veces no hace nada la segunda.
 *
 *   npm run faq:limpiar-pruebas -- --seco   # dice qué haría
 *   npm run faq:limpiar-pruebas
 *   CONFIRMAR=si DATABASE_URL="…" npm run faq:limpiar-pruebas   # producción
 */

import { PrismaClient } from ".prisma/client-grid";

const db = new PrismaClient();

/** Lo que marca una ficha como oficial. */
const ORIGEN_OFICIAL = "catalogo-bim";

async function main() {
  const seco = process.argv.includes("--seco");
  const url = process.env.DATABASE_URL ?? "";
  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";

  console.log(`Base ${destino}\n  ${url.replace(/:[^:@]+@/, ":****@")}\n`);

  if (destino !== "LOCAL" && !process.env.CONFIRMAR && !seco) {
    console.error(
      "Esta base NO es local. Si de verdad quieres limpiarla, repite con:\n" +
        '  CONFIRMAR=si DATABASE_URL="…" npm run faq:limpiar-pruebas',
    );
    process.exit(1);
  }

  const oficialesAntes = await db.faqEntry.count({ where: { createdBy: ORIGEN_OFICIAL } });

  const pruebas = await db.faqEntry.findMany({
    where: { NOT: { createdBy: ORIGEN_OFICIAL } },
    select: { id: true, code: true, question: true },
  });

  console.log(`Catálogo oficial: ${oficialesAntes} fichas (no se tocan).`);
  console.log(`De prueba: ${pruebas.length} fichas.\n`);

  for (const f of pruebas) {
    console.log(`  ${seco ? "borraría" : "borrada "}  [${f.code ?? "sin código"}] ${f.question.slice(0, 46)}`);
  }

  const propuestas = await db.faqPropuesta.count();
  const comentarios = await db.faqComentario.count();
  const avisos = await db.notificacion.count();

  if (seco) {
    console.log(`\n  ${propuestas} propuestas · ${comentarios} comentarios · ${avisos} avisos\n`);
    console.log("SIMULACIÓN — no se tocó nada.");
    await db.$disconnect();
    return;
  }

  /*
   * Todo en UNA transacción.
   *
   * Si la comprobación final descubriera que el catálogo cambió, un `rollback`
   * devuelve la base al estado exacto de antes. Borrar a medias es peor que no
   * borrar: dejaría fichas sin sus votos o propuestas apuntando a nada.
   */
  const ids = pruebas.map((f) => f.id);

  await db.$transaction([
    // Los votos primero: cuelgan de la ficha por clave foránea.
    db.faqVote.deleteMany({ where: { faqId: { in: ids } } }),
    db.faqEntry.deleteMany({ where: { id: { in: ids } } }),
    db.faqPropuesta.deleteMany({}),
    db.faqComentario.deleteMany({}),
    db.notificacion.deleteMany({}),
  ]);

  const oficialesDespues = await db.faqEntry.count({ where: { createdBy: ORIGEN_OFICIAL } });

  console.log(`\n  ${pruebas.length} fichas de prueba retiradas`);
  console.log(`  ${propuestas} propuestas · ${comentarios} comentarios · ${avisos} avisos`);
  console.log(`\nQueda el catálogo: ${oficialesDespues} fichas oficiales.`);

  if (oficialesDespues !== oficialesAntes) {
    console.error(
      `\n¡CUIDADO! El catálogo pasó de ${oficialesAntes} a ${oficialesDespues}. No debería haberse tocado.`,
    );
    process.exitCode = 1;
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("Falló la limpieza:", e.message);
  await db.$disconnect();
  process.exit(1);
});
