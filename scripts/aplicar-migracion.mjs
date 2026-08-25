/**
 * Aplica el SQL de Knowledge Grid a la base configurada en DATABASE_URL.
 *
 * Se usa esto y NO `prisma db push` porque la base es COMPARTIDA: `db push`
 * compara el esquema con la base entera y quiere borrar todo lo que no esté
 * declarado —las tablas de horas, catálogos y vacaciones de las otras
 * herramientas—. Este script solo AÑADE lo de Knowledge Grid.
 *
 * Es idempotente: el SQL usa `IF NOT EXISTS` en todo.
 *
 *   npm run db:migrate                                    # local (.env.local)
 *   DATABASE_URL="postgres://…" npm run db:migrate:prod   # producción
 *
 * OJO con la diferencia: `db:migrate` carga `.env.local`, y dotenv PISA lo que
 * se pase por delante. Para apuntar a producción hace falta `db:migrate:prod`,
 * que no carga ningún archivo y usa la variable tal cual.
 */

import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

// Se avisa contra qué base se va a correr: en producción, equivocarse de
// destino es el error caro.
const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";
console.log(`Aplicando migración sobre base ${destino}\n  ${url.replace(/:[^:@]+@/, ":****@")}\n`);

if (destino !== "LOCAL" && !process.env.CONFIRMAR_PRODUCCION) {
  console.error(
    "Esta base NO es local. Si es lo que quieres, repite con:\n" +
      '  CONFIRMAR_PRODUCCION=si DATABASE_URL="…" npm run db:migrate:prod',
  );
  process.exit(1);
}

/*
 * Las migraciones vigentes, EN ORDEN.
 *
 * Se listan a mano en vez de leer la carpeta: `001` quedó obsoleta —creaba las
 * tablas sin esquema y las colgaba de `TeamMember`— y un `readdir` la
 * arrastraría. Como todas son idempotentes, aplicarlas siempre todas deja la
 * base al día sin llevar registro de cuál se corrió.
 */
const MIGRACIONES = ["002_despliegue_grid.sql", "003_faq_bim.sql"];

const client = new Client({ connectionString: url });

try {
  await client.connect();

  for (const nombre of MIGRACIONES) {
    const sql = readFileSync(new URL(`../prisma/migrations/${nombre}`, import.meta.url), "utf8");
    await client.query(sql);
    console.log(`  aplicada  ${nombre}`);
  }

  console.log("\nBase al día.");
} catch (e) {
  console.error("Falló la migración:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
