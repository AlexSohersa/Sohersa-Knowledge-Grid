/**
 * Carga las capacitaciones reales en la base.
 *
 * Las fichas salen de las notas de Gemini de cada sesión, leídas con el mismo
 * intérprete que usa el importador de Administración —`leer-notas-gemini.ts`—,
 * así que lo que entra por aquí es idéntico a lo que entraría por la pantalla.
 * Aquí solo se guarda la FICHA; el material de Drive lo coloca la pantalla, que
 * corre con la cuenta de quien la usa y puede copiar lo que esa persona ve.
 *
 * POR QUÉ UN SCRIPT Y NO LA PANTALLA. Las notas están compartidas con unas
 * cuentas y no con otras, y la pantalla solo puede leer lo que ve quien la
 * abre. Esto adelanta las que ya se pudieron leer para que el catálogo no
 * espere; las que falten se importan desde Administración.
 *
 * Usa `pg` y no Prisma por lo mismo que el importador del FAQ: Prisma no
 * alcanza Neon desde esta máquina.
 *
 *   CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/cargar-capacitaciones.ts
 *
 * Es idempotente: reconoce lo ya cargado por `notasDocId` y lo actualiza en vez
 * de duplicarlo, así que correrlo dos veces no hace daño.
 */

import { Client } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));

/* ── Lo que se va a cargar ───────────────────────────────────────────────── */

interface Entrada {
  /** El documento de notas, para no duplicar al reimportar. */
  docId: string;
  /** El texto de las notas, guardado junto al script. */
  archivo: string;
  categoria: string;
  nivel: string;
  /** El id de Drive de la grabación, si se conoce. */
  grabacion: string | null;
  /**
   * Quién impartió, cuando la deducción no basta.
   *
   * El intérprete cuenta quién conduce más puntos del desglose, y eso acierta
   * cuando una sola persona lleva la sesión. En DISC no: Alba López condujo la
   * parte del test y sale más veces, pero quien impartió fue Ale Cervantes
   * —lo dice el propio título—. Se fija a mano en vez de retorcer la
   * deducción para que acierte en un caso y falle en otros.
   */
  instructor?: string;
}

/*
 * Las categorías van a mano y no deducidas del título.
 *
 * Se podría adivinar por palabras clave, pero «Design Thinking» no dice si es
 * de BIM o de habilidades, y equivocarse deja la ficha mal clasificada en el
 * catálogo. Son seis: escribirlas es más honesto que adivinarlas.
 */
const ENTRADAS: Entrada[] = [
  {
    docId: "1z5zkAMp0iHeL18HTJhnof1XVWVoHrWPaqa12EH7aLSI",
    archivo: "notas/disc.txt",
    categoria: "Habilidades",
    nivel: "Básico",
    grabacion: "1x3x15U0QJCPfHc-kfFrXDIoWco0xix7z",
    instructor: "Ale Cervantes",
  },
  {
    docId: "1Y_MPFXFmyJIBaHDzUwOBLauCslL0pIMiuuktDzxPyJE",
    archivo: "notas/design-thinking.txt",
    categoria: "Habilidades",
    nivel: "Básico",
    grabacion: "1sO_qJJCKzgg1qazqBrVBLZu9G0huLaWa",
  },
  {
    docId: "1CVmcx0xF7yLyssHEWeZc3Rsb4CWLY4HBdkJQ_82DNkY",
    archivo: "notas/inteligencia-emocional.txt",
    categoria: "Habilidades",
    nivel: "Básico",
    grabacion: "1ywwHwvup1KID_nssLRVu0Bu6-V8yJiwQ",
  },
];

/* ── El intérprete, en su versión para script ────────────────────────────── */
//
// Es el mismo criterio que `leer-notas-gemini.ts`, reescrito aquí sin sus
// dependencias de servidor (`server-only`, el cliente de Google) para que se
// pueda correr desde la línea de órdenes. Lo que cambia es de dónde sale el
// texto —de un archivo en vez de la API de Docs—, no cómo se interpreta.

interface Notas {
  titulo: string;
  fecha: Date | null;
  resumen: string | null;
  temas: { titulo: string; detalle: string }[];
  objetivos: string[];
  grabacionId: string | null;
  instructor: string | null;
  asistentes: number;
}

function limpiarMarcas(s: string): string {
  return s
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/\s*<https?:\/\/[^>]*>/g, "")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\*/g, "*")
    .trim();
}

function esEncabezado(linea: string, nombre: string): boolean {
  const l = limpiarMarcas(linea).toLowerCase();
  return l === nombre.toLowerCase() || l === `${nombre.toLowerCase()}:`;
}

function esEncabezadoCualquiera(linea: string): boolean {
  if (!linea) return false;
  if (/^#{1,6}\s/.test(linea)) return true;
  return /^\*\*[^*]+\*\*:?$/.test(linea.trim());
}

function esSoloFecha(l: string): boolean {
  const s = limpiarMarcas(l);
  return (
    /^\d{4}\/\d{2}\/\d{2}$/.test(s) ||
    /^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\w*\s+\d{1,2},?\s+\d{4}$/i.test(s)
  );
}

function normalizarTitulo(s: string): string {
  return limpiarMarcas(s)
    .replace(/\s*:\s*\d{4}\/\d{2}\/\d{2}.*$/, "")
    .replace(/\s*-\s*Notas de Gemini\s*$/i, "")
    .trim()
    .slice(0, 160);
}

function interpretar(texto: string): Notas {
  const lineas = texto.split("\n").map((l) => l.trim());

  // ── Título: el encabezado de nivel 2, no la primera línea con texto (esa es
  // la fecha suelta que Gemini pone encima).
  let titulo = "Capacitación sin título";
  for (const l of lineas) {
    if (!/^##\s/.test(l)) continue;
    const t = normalizarTitulo(l.replace(/^##\s*/, ""));
    if (t.length > 3) {
      titulo = t;
      break;
    }
  }
  if (titulo === "Capacitación sin título") {
    for (const l of lineas) {
      if (!l || l.startsWith("#")) continue;
      if (/^(Invitado|Archivos adjuntos|Registros)/.test(l)) continue;
      if (esSoloFecha(l)) continue;
      const t = normalizarTitulo(l);
      if (t.length > 3) {
        titulo = t;
        break;
      }
    }
  }

  // ── Fecha
  let fecha: Date | null = null;
  const iso = texto.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) fecha = d;
  }
  if (!fecha) {
    const MESES: Record<string, number> = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
      jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
    };
    const es = texto.match(
      /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\w*\s+(\d{1,2}),?\s+(\d{4})/i,
    );
    if (es) {
      const mes = MESES[es[1].toLowerCase().slice(0, 3)];
      if (mes !== undefined) {
        const d = new Date(Number(es[3]), mes, Number(es[2]));
        if (!Number.isNaN(d.getTime())) fecha = d;
      }
    }
  }

  // ── Resumen
  let resumen: string | null = null;
  const iR = lineas.findIndex((l) => esEncabezado(l, "Resumen"));
  if (iR !== -1) {
    const dentro: string[] = [];
    for (let j = iR + 1; j < lineas.length; j++) {
      if (esEncabezadoCualquiera(lineas[j])) break;
      if (lineas[j]) dentro.push(limpiarMarcas(lineas[j]));
    }
    const t = dentro.join("\n").trim();
    resumen = t ? t.slice(0, 4000) : null;
  }

  // ── Temas
  const temas: { titulo: string; detalle: string }[] = [];
  const iD = lineas.findIndex((l) => esEncabezado(l, "Detalles"));
  if (iD !== -1) {
    for (let j = iD + 1; j < lineas.length; j++) {
      if (esEncabezadoCualquiera(lineas[j])) break;
      const punto = lineas[j].match(/^[-·•*]\s+(.+)$/);
      if (!punto) continue;

      const cuerpo = limpiarMarcas(punto[1]);
      const conTitulo = cuerpo.match(/^(.{3,120}?):\s+(.+)$/);

      if (conTitulo) {
        temas.push({
          titulo: conTitulo[1].trim().slice(0, 160),
          detalle: conTitulo[2].trim().slice(0, 2000),
        });
      } else {
        temas.push({
          titulo: cuerpo.slice(0, 80).trim() + (cuerpo.length > 80 ? "…" : ""),
          detalle: cuerpo.slice(0, 2000),
        });
      }
    }
  }

  // ── Objetivos
  const objetivos: string[] = [];
  const iP = lineas.findIndex((l) => esEncabezado(l, "Próximos pasos"));
  if (iP !== -1) {
    for (let j = iP + 1; j < lineas.length && objetivos.length < 12; j++) {
      if (esEncabezadoCualquiera(lineas[j])) break;
      const punto = lineas[j].match(/^[-·•*]\s+(.+)$/);
      if (!punto) continue;
      const t = limpiarMarcas(punto[1]).replace(/^\[[^\]]*\]\s*/, "").trim();
      if (t) objetivos.push(t.slice(0, 300));
    }
  }

  // ── Grabación
  const zona = texto.match(/Registros de la reuni[óo]n([\s\S]{0,400})/i);
  const grab = (zona?.[1] ?? texto).match(
    /https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/,
  );

  // ── Instructor: quien más veces conduce los puntos del desglose.
  const cuenta = new Map<string, number>();
  const NOMBRE = "[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}";
  const VERBOS =
    "explic|present|detall|introdu|condu|gui[óo]|expus|expon|coordin|demostr|destac|realiz|" +
    "señal|indic|plante|concluy|comparti|mencion|defini|abord|dio inicio|invit|habl|imparti";
  const reInstr = new RegExp(`(${NOMBRE})\\s+(?:${VERBOS})`, "g");
  let m: RegExpExecArray | null;
  while ((m = reInstr.exec(texto)) !== null) {
    const n = m[1].trim();
    if (n.length < 5) continue;
    cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
  }
  let instructor: string | null = null;
  if (cuenta.size > 0) {
    const [mejor, veces] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0];
    if (veces >= 2) instructor = mejor;
  }

  // ── Asistentes
  const zonaInv = texto.match(
    /Invitado([\s\S]{0,6000}?)(?:Archivos adjuntos|Registros de la reuni|###)/i,
  );
  const correos = zonaInv?.[1].match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? [];

  return {
    titulo,
    fecha,
    resumen,
    temas,
    objetivos,
    grabacionId: grab?.[1] ?? null,
    instructor,
    asistentes: new Set(correos.map((c) => c.toLowerCase())).size,
  };
}

/** Cuánto dura, estimado. Mismo criterio que el importador. */
function estimarDuracion(temas: number): { min: number; texto: string | null } {
  if (temas === 0) return { min: 0, texto: null };
  const min = Math.max(30, temas * 10);
  const h = Math.floor(min / 60);
  const mm = min % 60;
  return {
    min,
    texto: h > 0 ? (mm > 0 ? `~${h} h ${mm} min` : `~${h} h`) : `~${mm} min`,
  };
}

/* ── Carga ───────────────────────────────────────────────────────────────── */

async function main() {
  /*
   * `SOLO_LEER=si` enseña lo que se interpretaría, sin tocar la base.
   *
   * Sirve para comprobar que las notas se leen bien ANTES de escribir nada,
   * que es cuando conviene descubrir que un título salió mal.
   */
  if (process.env.SOLO_LEER === "si") {
    for (const e of ENTRADAS) {
      const n = interpretar(readFileSync(join(AQUI, e.archivo), "utf8"));
      const dur = estimarDuracion(n.temas.length);
      console.log(`--- ${e.archivo}`);
      console.log(`  titulo     : ${n.titulo}`);
      // Lo que se GUARDARÁ, no lo deducido: si no coincidieran, esta vista no
      // serviría para comprobar nada.
      const quien = e.instructor ?? n.instructor;
      console.log(
        `  instructor : ${quien ?? "(ninguno)"}` +
          (e.instructor ? ` [fijado a mano; deducía «${n.instructor ?? "nada"}»]` : ""),
      );
      console.log(`  fecha      : ${n.fecha ? n.fecha.toLocaleDateString("es-MX") : "-"}`);
      console.log(`  temas ${String(n.temas.length).padStart(2)} · objetivos ${n.objetivos.length} · asistentes ${n.asistentes} · ${dur.texto}`);
      console.log(`  grabacion  : ${n.grabacionId ?? e.grabacion ?? "-"}`);
      const linea = n.resumen ? n.resumen.split("\n").join(" ").slice(0, 70) + "…" : "(ninguno)";
      console.log(`  resumen    : ${linea}`);
    }
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";
  console.log(`Cargando capacitaciones sobre base ${destino}\n`);

  if (destino !== "LOCAL" && process.env.CONFIRMAR !== "si") {
    console.error(
      'Esta base NO es local. Si es lo que quieres:\n  CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/cargar-capacitaciones.ts',
    );
    process.exit(1);
  }

  const c = new Client({ connectionString: url });
  await c.connect();

  try {
    // El siguiente código libre: se mira el MAYOR, no cuántas hay. Contar daría
    // uno ya usado si alguna se borró.
    const cod = await c.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace("code", '\\D', '', 'g'), '')::int), 0) AS n
         FROM "grid"."Training" WHERE "code" LIKE 'CAP-%'`,
    );
    let siguiente = Number(cod.rows[0].n) + 1;

    for (const e of ENTRADAS) {
      const texto = readFileSync(join(AQUI, e.archivo), "utf8");
      const n = interpretar(texto);

      // ¿Ya estaba? Se reconoce por el documento de origen.
      const ya = await c.query(
        `SELECT id, "code" FROM "grid"."Training" WHERE "notasDocId" = $1`,
        [e.docId],
      );

      const codigo: string = ya.rowCount
        ? ya.rows[0].code
        : `CAP-${String(siguiente++).padStart(3, "0")}`;

      const dur = estimarDuracion(n.temas.length);
      const grabacion = n.grabacionId ?? e.grabacion;
      const instructor = e.instructor ?? n.instructor;

      await c.query("BEGIN");

      let capId: string;

      if (ya.rowCount) {
        capId = ya.rows[0].id;
        await c.query(
          `UPDATE "grid"."Training"
              SET "title"=$2, "summary"=$3, "objectives"=$4, "instructor"=$5,
                  "category"=$6, "level"=$7, "status"='PUBLICADA',
                  "impartidaEn"=$8, "asistentes"=$9, "durationMin"=$10,
                  "duration"=$11, "period"=$12, "updatedAt"=NOW()
            WHERE id=$1`,
          [
            capId, n.titulo, n.resumen, n.objetivos, instructor,
            e.categoria, e.nivel, n.fecha, n.asistentes, dur.min,
            dur.texto, n.fecha ? String(n.fecha.getFullYear()) : null,
          ],
        );

        /*
         * Los temas se reemplazan enteros, pero solo si NADIE lleva avance.
         *
         * El progreso de las rutas cuelga del tema; borrarlos con gente a
         * medias les borraría lo hecho.
         */
        const av = await c.query(
          `SELECT COUNT(*)::int n FROM "grid"."PathProgress" p
             JOIN "grid"."TrainingTopic" t ON t.id = p."topicId"
            WHERE t."trainingId" = $1`,
          [capId],
        );
        if (av.rows[0].n === 0) {
          await c.query(`DELETE FROM "grid"."TrainingTopic" WHERE "trainingId"=$1`, [capId]);
        }
      } else {
        const ins = await c.query(
          `INSERT INTO "grid"."Training"
             ("id","code","title","summary","objectives","instructor","category","level",
              "status","notasDocId","impartidaEn","asistentes","durationMin","duration",
              "period","accent","views","createdBy","updatedAt","createdAt")
           VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,'PUBLICADA',$8,$9,$10,$11,$12,
                   $13,'#32D66B',0,$14,NOW(),NOW())
           RETURNING id`,
          [
            codigo, n.titulo, n.resumen, n.objetivos, instructor,
            e.categoria, e.nivel, e.docId, n.fecha, n.asistentes,
            dur.min, dur.texto, n.fecha ? String(n.fecha.getFullYear()) : null,
            "a.orozco@gruposohersa.com",
          ],
        );
        capId = ins.rows[0].id;
      }

      // Los temas, si no quedaron.
      const hay = await c.query(
        `SELECT COUNT(*)::int n FROM "grid"."TrainingTopic" WHERE "trainingId"=$1`,
        [capId],
      );

      let creados = 0;
      if (hay.rows[0].n === 0) {
        for (const [i, t] of n.temas.entries()) {
          const esPrimero = i === 0;
          await c.query(
            `INSERT INTO "grid"."TrainingTopic"
               ("id","trainingId","code","title","summary","kind","position",
                "videoUrl","videoDriveId","videoPropio","updatedAt","createdAt")
             VALUES (gen_random_uuid()::text,$1,$2,$3,$4,'Video',$5,$6,$7,false,NOW(),NOW())`,
            [
              capId,
              String(i + 1).padStart(2, "0"),
              t.titulo,
              t.detalle,
              i,
              // El video va en el primer tema: es la grabación de la sesión
              // entera, no de un punto concreto.
              esPrimero && grabacion ? `https://drive.google.com/file/d/${grabacion}/view` : null,
              esPrimero ? grabacion : null,
            ],
          );
          creados++;
        }
      }

      await c.query("COMMIT");

      console.log(`  ${codigo}  ${n.titulo}`);
      console.log(
        `           ${creados || n.temas.length} temas · ${n.objetivos.length} objetivos · ` +
          `${n.asistentes} asistentes · ${instructor ?? "sin instructor"}` +
          `${grabacion ? " · con grabación" : " · SIN grabación"}`,
      );
    }

    const total = await c.query(`SELECT COUNT(*)::int n FROM "grid"."Training"`);
    console.log(`\nCapacitaciones en la base: ${total.rows[0].n}`);
    console.log(
      "\nEl material de Drive lo coloca la pantalla de Administración, que corre\n" +
        "con la cuenta de quien la usa. Ahí se copian los videos a sus carpetas.",
    );
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("Falló la carga:", e instanceof Error ? e.message : e);
  process.exit(1);
});
