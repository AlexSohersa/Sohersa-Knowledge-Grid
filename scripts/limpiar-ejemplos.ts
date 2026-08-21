/**
 * Borra los datos de EJEMPLO, dejando solo lo real.
 *
 * Knowledge Grid se estrena con dos secciones, y las dos tienen contenido
 * verdadero:
 *
 *   · La BIBLIOTECA — los documentos del cronograma, que el equipo ya usa.
 *   · Las CAPACITACIONES — armadas desde ese mismo cronograma: sus materiales
 *     apuntan a archivos reales de Drive y sus temas, a grabaciones que el
 *     equipo grabó. No son inventadas.
 *
 * Lo demás se sembró para poder ver el diseño funcionando. Publicarlo así
 * sería peor que no publicarlo: una FAQ inventada y una comunidad con
 * conversaciones falsas le restan credibilidad a lo que sí es cierto.
 *
 * Lo que se CONSERVA:
 *   · `Resource` — la biblioteca. Se sincroniza desde Google Sheets, no de aquí.
 *   · `Training` + `TrainingTopic` + `TrainingMaterial` — las capacitaciones.
 *   · `Automation` — se suben a mano.
 *   · `SyncLog` — la bitácora de sincronizaciones, compartida con el portal.
 *   · `GridAdmin` — quién administra. Sin esto nadie podría entrar a
 *     Administración a cargar el contenido de verdad.
 *
 * Lo que se BORRA: herramientas, rutas, FAQ, comunidad, y lo personal que
 * cuelga de ellas (avances, votos, guardados, historial).
 *
 * El orden importa: las hijas antes que las madres, porque aunque casi todas
 * las claves foráneas están en CASCADE, borrar explícitamente deja claro qué
 * se está tirando y no depende de que la cascada esté bien puesta.
 *
 *   npm run db:limpiar                                  # local
 *   CONFIRMAR=si DATABASE_URL="…" npm run db:limpiar:prod   # producción
 */

import { PrismaClient } from ".prisma/client-grid";

const db = new PrismaClient();

/** Lo que se conserva, para poder comprobar que sigue intacto al terminar. */
async function inventario() {
  return {
    biblioteca: await db.resource.count(),
    capacitaciones: await db.training.count(),
    temas: await db.trainingTopic.count(),
    materiales: await db.trainingMaterial.count(),
    automatizaciones: await db.automation.count(),
    admins: await db.gridAdmin.count(),
  };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";

  console.log(`Base ${destino}\n  ${url.replace(/:[^:@]+@/, ":****@")}\n`);

  /*
   * Un aviso antes de tocar producción. Va ANTES de consultar nada: si el
   * destino es el equivocado, ni siquiera hay que abrir la conexión.
   *
   * Aquí no hay vuelta atrás: lo que se borra son filas, no archivos, y no hay
   * papelera. En local da igual —se vuelve a sembrar—, pero en Neon un borrado
   * de más obliga a restaurar una copia.
   */
  if (destino !== "LOCAL" && !process.env.CONFIRMAR) {
    console.error(
      "Esta base NO es local. Si de verdad quieres limpiarla, repite con:\n" +
        '  CONFIRMAR=si DATABASE_URL="…" npm run db:limpiar:prod',
    );
    process.exit(1);
  }

  const antes = await inventario();

  console.log("Borrando los datos de ejemplo…\n");

  /*
   * Las tablas, de las hojas hacia la raíz.
   *
   * `PathProgress` cuelga de `PathAssignment`, que cuelga de `LearningPath`;
   * si se borrara la ruta primero, la cascada se llevaría el avance sin que
   * quedara constancia de cuánto se tiró.
   */
  const pasos: Array<[string, () => Promise<{ count: number }>]> = [
    /*
     * Las rutas, de las hojas hacia la raíz.
     *
     * `PathItem` apunta a `Training` con `onDelete: SetNull`, así que borrar
     * los elementos de una etapa NO se lleva por delante las capacitaciones
     * que referencian: solo desaparece el vínculo. Es justo lo que hace falta
     * aquí —fuera la ruta de ejemplo, intactas las capacitaciones reales—.
     */
    ["avances de ruta", () => db.pathProgress.deleteMany()],
    ["asignaciones de ruta", () => db.pathAssignment.deleteMany()],
    ["elementos de etapa", () => db.pathItem.deleteMany()],
    ["etapas", () => db.pathStage.deleteMany()],
    ["rutas", () => db.learningPath.deleteMany()],

    /*
     * Las capacitaciones NO se tocan: están armadas desde el cronograma real
     * y sus materiales apuntan a archivos que existen en Drive. Si algún día
     * hiciera falta borrarlas, el orden sería material → tema → capacitación.
     */

    ["votos de FAQ", () => db.faqVote.deleteMany()],
    ["preguntas frecuentes", () => db.faqEntry.deleteMany()],

    ["comentarios de respuesta", () => db.answerComment.deleteMany()],
    ["votos de respuesta", () => db.answerVote.deleteMany()],
    ["respuestas", () => db.answer.deleteMany()],
    ["preguntas de la comunidad", () => db.question.deleteMany()],

    ["herramientas", () => db.tool.deleteMany()],

    /*
     * Lo personal apunta a su contenido por código, no por clave foránea, así
     * que nada lo limpiaría solo. Se conserva lo que apunta a algo que sigue
     * existiendo —una capacitación o un documento— y se tira lo que quedaría
     * como tarjeta rota: lo que señalaba a una herramienta o una FAQ borrada.
     */
    ["guardados de contenido borrado", () =>
      db.bookmark.deleteMany({ where: { kind: { notIn: ["cap", "doc"] } } })],
    ["historial de contenido borrado", () =>
      db.viewLog.deleteMany({ where: { kind: { notIn: ["cap", "doc"] } } })],
  ];

  let total = 0;
  for (const [nombre, borrar] of pasos) {
    const { count } = await borrar();
    total += count;
    if (count > 0) console.log(`  ${String(count).padStart(5)}  ${nombre}`);
  }

  const despues = await inventario();

  console.log(`\n  ${total} filas borradas.\n`);
  console.log("Lo que queda:");
  console.log(`  ${String(despues.biblioteca).padStart(5)}  documentos de la biblioteca`);
  console.log(`  ${String(despues.capacitaciones).padStart(5)}  capacitaciones`);
  console.log(`  ${String(despues.temas).padStart(5)}  temas`);
  console.log(`  ${String(despues.materiales).padStart(5)}  materiales`);
  console.log(`  ${String(despues.automatizaciones).padStart(5)}  automatizaciones`);
  console.log(`  ${String(despues.admins).padStart(5)}  administradores`);

  /*
   * La comprobación que de verdad importa: nada de lo que se conserva debió
   * cambiar. Si algo bajó, una cascada se llevó por delante contenido real y
   * hay que enterarse ahora, no al abrir la aplicación.
   */
  const intacto: Array<[string, number, number]> = [
    ["biblioteca", antes.biblioteca, despues.biblioteca],
    ["capacitaciones", antes.capacitaciones, despues.capacitaciones],
    ["temas", antes.temas, despues.temas],
    ["materiales", antes.materiales, despues.materiales],
  ];

  for (const [que, a, d] of intacto) {
    if (a !== d) {
      console.error(`\n¡CUIDADO! ${que}: de ${a} a ${d}. No debería haberse tocado.`);
      process.exitCode = 1;
    }
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("Falló la limpieza:", e.message);
  await db.$disconnect();
  process.exit(1);
});
