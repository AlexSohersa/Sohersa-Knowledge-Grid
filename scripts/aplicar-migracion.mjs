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

const sql = readFileSync(new URL("../prisma/migrations/002_despliegue_grid.sql", import.meta.url), "utf8");
const client = new Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log("Migración aplicada.");
} catch (e) {
  console.error("Falló la migración:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
