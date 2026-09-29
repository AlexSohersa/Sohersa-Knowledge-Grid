/**
 * Retira los avisos que llevan a algo que ya no existe.
 *
 * Al borrar una pregunta sus avisos quedaban en la campana apuntando a una
 * página desaparecida: quien pulsaba acababa en un «no encontrado», y el
 * contador de sin leer subía por algo que nadie podía abrir.
 *
 * Eso ya no pasa —borrar una pregunta se lleva sus avisos—, pero lo que se
 * borró ANTES de ese arreglo sigue ahí. Esto lo limpia.
 *
 * SE MIRA SI EL DESTINO EXISTE, no una lista de ids. Así vale para cualquier
 * aviso huérfano, venga de donde venga, y no hay que mantener nada cuando se
 * añada una sección nueva.
 *
 *   SOLO_LEER=si DATABASE_URL="…" npx tsx scripts/limpiar-avisos-huerfanos.ts
 *   CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/limpiar-avisos-huerfanos.ts
 */

import { Client } from "pg";

/** Qué ruta corresponde a qué tabla. */
const DESTINOS: { ruta: string; tabla: string }[] = [
  { ruta: "/comunidad/", tabla: "Question" },
  { ruta: "/capacitaciones/", tabla: "Training" },
  { ruta: "/faq/", tabla: "FaqEntry" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const soloLeer = process.env.SOLO_LEER === "si";
  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";

  console.log(`Avisos huérfanos en base ${destino}${soloLeer ? " · solo mirando" : ""}\n`);

  if (!soloLeer && destino !== "LOCAL" && process.env.CONFIRMAR !== "si") {
    console.error(
      'Repite con:\n  CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/limpiar-avisos-huerfanos.ts',
    );
    process.exit(1);
  }

  const c = new Client({ connectionString: url });
  await c.connect();

  try {
    let total = 0;

    for (const { ruta, tabla } of DESTINOS) {
      /*
       * El `href` se compara con la ruta MÁS el id de la fila.
       *
       * Comparar solo el prefijo dejaría fuera los avisos que apuntan a algo
       * que sí existe, y quitar el prefijo con `substring` obligaría a suponer
       * que ningún id lleva barras. Construir la ruta completa desde la tabla
       * es lo que lo hace exacto.
       */
      const huerfanos = await c.query(
        `SELECT n.id, n.href, n.title, n.body
           FROM "grid"."Notificacion" n
          WHERE n.href LIKE $1
            AND NOT EXISTS (
              SELECT 1 FROM "grid"."${tabla}" t WHERE n.href = $2 || t.id
            )`,
        [`${ruta}%`, ruta],
      );

      if (huerfanos.rowCount === 0) continue;

      console.log(`  ${ruta}  ${huerfanos.rowCount} sin destino`);
      for (const h of huerfanos.rows) {
        console.log(`      ${(h.body ?? h.title ?? "").slice(0, 58)}`);
      }

      if (!soloLeer) {
        const borrados = await c.query(
          `DELETE FROM "grid"."Notificacion" n
            WHERE n.href LIKE $1
              AND NOT EXISTS (
                SELECT 1 FROM "grid"."${tabla}" t WHERE n.href = $2 || t.id
              )`,
          [`${ruta}%`, ruta],
        );
        total += borrados.rowCount ?? 0;
      } else {
        total += huerfanos.rowCount ?? 0;
      }

      console.log();
    }

    if (total === 0) {
      console.log("  No hay ninguno: todos los avisos llevan a algo que existe.");
    } else {
      console.log(`  ${soloLeer ? "Se retirarían" : "Retirados"}: ${total}`);
    }
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
