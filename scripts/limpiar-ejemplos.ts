/**
 * Borra los datos de EJEMPLO, dejando solo lo real.
 *
 * Knowledge Grid se estrena con la biblioteca —los 152 documentos del
 * cronograma, que son reales y los usa el equipo todos los días—. Las demás
 * secciones se sembraron para poder ver el diseño funcionando, y publicarlas
 * así sería peor que no publicarlas: una FAQ inventada y una comunidad con
 * conversaciones falsas le restan credibilidad a lo que sí es cierto.
 *
 * Lo que se conserva:
 *   · `Resource` — la biblioteca. Se sincroniza desde Google Sheets, no de aquí.
 *   · `Automation` — se suben a mano; hoy está vacía.
 *   · `SyncLog` — la bitácora de sincronizaciones, compartida con el portal.
 *   · `GridAdmin` — quién administra. Sin esto nadie podría entrar a
 *     Administración a cargar el contenido de verdad.
 *
 * Lo que se borra: herramientas, capacitaciones, rutas, FAQ, comunidad, y lo
 * personal que cuelga de ellas (avances, votos, guardados, historial).
 *
 * El orden importa: las hijas antes que las madres, porque aunque casi todas
 * las claves foráneas están en CASCADE, borrar explícitamente deja claro qué
 * se está tirando y no depende de que la cascada esté bien puesta.
 *
 *   npm run db:limpiar              # local, pregunta antes
 *   CONFIRMAR=si npm run db:limpiar # sin preguntar
 */

import { PrismaClient } from ".prisma/client-grid";

const db = new PrismaClient();

/** Lo que se conserva, para poder decirlo en el informe. */
async function inventario() {
  return {
    biblioteca: await db.resource.count(),
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
    ["avances de ruta", () => db.pathProgress.deleteMany()],
    ["asignaciones de ruta", () => db.pathAssignment.deleteMany()],
    ["elementos de etapa", () => db.pathItem.deleteMany()],
    ["etapas", () => db.pathStage.deleteMany()],
    ["rutas", () => db.learningPath.deleteMany()],

    ["materiales de capacitación", () => db.trainingMaterial.deleteMany()],
    ["temas de capacitación", () => db.trainingTopic.deleteMany()],
    ["capacitaciones", () => db.training.deleteMany()],

    ["votos de FAQ", () => db.faqVote.deleteMany()],
    ["preguntas frecuentes", () => db.faqEntry.deleteMany()],

    ["comentarios de respuesta", () => db.answerComment.deleteMany()],
    ["votos de respuesta", () => db.answerVote.deleteMany()],
    ["respuestas", () => db.answer.deleteMany()],
    ["preguntas de la comunidad", () => db.question.deleteMany()],

    ["herramientas", () => db.tool.deleteMany()],

    // Lo personal apunta a lo anterior por código, no por clave foránea: se
    // limpia entero porque un guardado a una capacitación que ya no existe
    // sería una tarjeta rota en la pantalla de Guardados.
    ["guardados", () => db.bookmark.deleteMany()],
    ["historial", () => db.viewLog.deleteMany()],
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
  console.log(`  ${String(despues.automatizaciones).padStart(5)}  automatizaciones`);
  console.log(`  ${String(despues.admins).padStart(5)}  administradores`);

  if (despues.biblioteca !== antes.biblioteca) {
    console.error(
      `\n¡CUIDADO! La biblioteca cambió de ${antes.biblioteca} a ${despues.biblioteca}. No debería haberse tocado.`,
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
