/**
 * Importa el catálogo de FAQ BIM desde el Excel de Estandarización y Calidad.
 *
 * Habla SQL directo con `pg` en vez de usar Prisma por una razón de red: desde
 * las máquinas del equipo el motor de Prisma no alcanza el servidor de Neon
 * —ni por el pooler ni por el endpoint directo—, mientras que `pg` conecta sin
 * problema. Como la importación se lanza desde aquí, se usa el cliente que sí
 * llega.
 *
 * Las reglas:
 *   · lee el `.xlsx` (los pasos van separados por saltos de línea reales);
 *   · IGNORA la columna `Imagen error`, que está rota —51 celdas con `#VALUE!`—
 *     y empareja las capturas por CÓDIGO contra el índice de Drive;
 *   · actualiza por código en vez de duplicar, y respeta los votos ya emitidos.
 *
 *   npm run faq:importar -- --seco                      # local, sin escribir
 *   npm run faq:importar                                # local
 *   CONFIRMAR=si DATABASE_URL="…" npm run faq:importar:prod   # producción
 */

import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import * as XLSX from "xlsx";

const EXCEL = "datos/FAQ_BIM_base_de_datos_V10.xlsx";
const INDICE_IMAGENES = "datos/imagenes-faq.json";

/** Los sentinelas que el Excel usa para «no hay dato». */
const VACIOS = new Set(["#value!", "[pendiente]", "", "-", "n/a"]);

type Fila = Record<string, unknown>;
type Imagen = { driveId: string; nombre: string };

function limpiar(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (VACIOS.has(s.toLowerCase())) return null;
  return s || null;
}

/**
 * Parte una solución en pasos y les quita la numeración.
 *
 * Se corta por saltos de línea —que el `.xlsx` sí conserva— y no adivinando por
 * «1. »: hay pasos que contienen números («…supera los 300 MB, evaluar…») y
 * partir por ahí los destrozaría.
 */
function pasos(v: unknown): string[] {
  const s = limpiar(v);
  if (!s) return [];
  return s
    .split(/\r?\n/)
    .map((p) => p.trim().replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

/** Las palabras clave vienen separadas por « · ». */
function palabras(v: unknown): string[] {
  const s = limpiar(v);
  if (!s) return [];
  return s.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
}

/** Normaliza un código a tres dígitos: `RVT-32` → `RVT-032`. */
function normalizarCodigo(codigo: string): string {
  const m = codigo.trim().toUpperCase().match(/^(RVT|FRM)-0*(\d+)$/);
  return m ? `${m[1]}-${m[2].padStart(3, "0")}` : codigo.trim().toUpperCase();
}

async function main() {
  const seco = process.argv.includes("--seco");
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const remota = !url.includes("localhost");
  console.log(
    `Base ${remota ? "REMOTA (¡producción!)" : "LOCAL"}\n  ${url.replace(/:[^:@]+@/, ":****@")}\n`,
  );

  if (remota && !process.env.CONFIRMAR && !seco) {
    console.error(
      "Esta base NO es local. Si es lo que quieres, repite con:\n" +
        '  CONFIRMAR=si DATABASE_URL="…" npm run faq:importar:prod',
    );
    process.exit(1);
  }

  if (!existsSync(EXCEL)) {
    console.error(`No está el Excel en ${EXCEL}.`);
    process.exit(1);
  }

  /* ── Las capturas, emparejadas por código ─────────────────────────────── */
  const imagenes = new Map<string, Imagen>();
  if (existsSync(INDICE_IMAGENES)) {
    const idx = JSON.parse(readFileSync(INDICE_IMAGENES, "utf8")) as Record<string, Imagen>;
    for (const [codigo, img] of Object.entries(idx)) {
      imagenes.set(normalizarCodigo(codigo), img);
    }
    console.log(`Índice de capturas: ${imagenes.size} imágenes.`);
  }

  /* ── El Excel ─────────────────────────────────────────────────────────── */
  const libro = XLSX.read(readFileSync(EXCEL), { type: "buffer" });
  const hoja = libro.Sheets["FAQ"];
  if (!hoja) {
    console.error(`El Excel no tiene hoja «FAQ». Tiene: ${libro.SheetNames.join(", ")}`);
    process.exit(1);
  }

  const filas = XLSX.utils.sheet_to_json<Fila>(hoja).filter((f) => limpiar(f["ID"]));
  console.log(`${filas.length} fichas en el Excel.\n`);

  const c = new Client({
    connectionString: url,
    ssl: remota ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();

  let creadas = 0;
  let actualizadas = 0;
  let conImagen = 0;

  try {
    if (!seco) await c.query("BEGIN");

    for (const [i, f] of filas.entries()) {
      const code = normalizarCodigo(String(f["ID"]));
      const titulo = limpiar(f["Título"]);
      if (!titulo) continue;

      const img = imagenes.get(code) ?? null;
      if (img) conImagen++;

      const datos = {
        category: limpiar(f["Categoria"]) ?? "Sin categoría",
        question: titulo,
        answer: limpiar(f["Síntoma"]) ?? titulo,
        steps: pasos(f["Solución Recomendada"]),
        platform: limpiar(f["Plataforma"]),
        errorMessage: limpiar(f["Mensaje error"]),
        symptom: limpiar(f["Síntoma"]),
        cause: limpiar(f["Causa probable"]),
        altSteps: pasos(f["Solución Alternativa"]),
        keywords: palabras(f["Palabras clave"]),
        imageDriveId: img?.driveId ?? null,
        imageName: img?.nombre ?? null,
        position: i,
      };

      if (seco) continue;

      /*
       * `ON CONFLICT (code) DO UPDATE` es lo que hace repetible la importación:
       * `helpful` y `notHelpful` quedan FUERA del update a propósito, para no
       * tirar los votos que la gente ya dio cada vez que el área publique una
       * versión nueva del Excel.
       */
      const r = await c.query(
        `INSERT INTO "grid"."FaqEntry"
           (id, code, category, question, answer, steps, platform, "errorMessage",
            symptom, cause, "altSteps", keywords, "imageDriveId", "imageName",
            position, published, "createdBy", "updatedAt", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,'catalogo-bim',now(),now())
         ON CONFLICT (code) DO UPDATE SET
           category = EXCLUDED.category,
           question = EXCLUDED.question,
           answer = EXCLUDED.answer,
           steps = EXCLUDED.steps,
           platform = EXCLUDED.platform,
           "errorMessage" = EXCLUDED."errorMessage",
           symptom = EXCLUDED.symptom,
           cause = EXCLUDED.cause,
           "altSteps" = EXCLUDED."altSteps",
           keywords = EXCLUDED.keywords,
           "imageDriveId" = EXCLUDED."imageDriveId",
           "imageName" = EXCLUDED."imageName",
           position = EXCLUDED.position,
           "updatedAt" = now()
         RETURNING (xmax = 0) AS creada`,
        [
          randomUUID(),
          code,
          datos.category,
          datos.question,
          datos.answer,
          datos.steps,
          datos.platform,
          datos.errorMessage,
          datos.symptom,
          datos.cause,
          datos.altSteps,
          datos.keywords,
          datos.imageDriveId,
          datos.imageName,
          datos.position,
        ],
      );

      // `xmax = 0` distingue un INSERT de un UPDATE en un upsert de Postgres.
      if (r.rows[0]?.creada) creadas++;
      else actualizadas++;
    }

    if (!seco) await c.query("COMMIT");
  } catch (e) {
    if (!seco) await c.query("ROLLBACK").catch(() => {});
    throw e;
  }

  const total = await c.query(`select count(*)::int n from "grid"."FaqEntry"`);

  console.log(seco ? "SIMULACIÓN — no se escribió nada.\n" : "");
  console.log(`  ${creadas} creadas · ${actualizadas} actualizadas`);
  console.log(`  ${conImagen} con captura · ${filas.length - conImagen} sin captura`);
  console.log(`\n  Total de fichas en la base: ${total.rows[0].n}`);

  await c.end();
}

main().catch((e) => {
  console.error("Falló la importación:", e.message);
  process.exit(1);
});
