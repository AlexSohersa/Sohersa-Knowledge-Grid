/**
 * FAQ de MUESTRA para la presentación — y su borrado.
 *
 * Carga preguntas frecuentes que ejercitan TODAS las variantes que sabe pintar
 * la pantalla, para que en la demostración se vea de qué es capaz y no solo un
 * caso repetido seis veces:
 *
 *   · respuesta corta, de un párrafo;
 *   · respuesta con pasos numerados;
 *   · con enlace al PDF del manual en la biblioteca;
 *   · con enlace a una capacitación;
 *   · con enlace a ambos;
 *   · con votos ya contados, para ver el «te sirvió» con números;
 *   · una sin publicar, que solo ve quien administra.
 *
 * Las preguntas y sus respuestas son verosímiles pero INVENTADAS. Lo que sí es
 * real es aquello a lo que apuntan: los documentos y las capacitaciones que ya
 * están en producción, buscados por su código y su título. Un enlace roto en
 * una demostración se nota más que cualquier otra cosa.
 *
 * CÓMO SE BORRA. Todo lo que crea lleva `createdBy = 'demo@knowledge-grid'`,
 * así que retirarlo es exacto y no depende de acordarse de cuáles fueron:
 *
 *   DATABASE_URL="…" npx tsx scripts/faq-demo.ts --borrar
 *
 * Es idempotente: cargar dos veces no duplica —primero borra lo suyo—.
 *
 *   DATABASE_URL="…" npx tsx scripts/faq-demo.ts            # cargar
 *   DATABASE_URL="…" npx tsx scripts/faq-demo.ts --borrar   # quitar
 */

import { Client } from "pg";
import { randomUUID } from "node:crypto";

/** La marca que hace reversible esta carga. */
const MARCA = "demo@knowledge-grid";

/** Una FAQ de muestra, antes de resolver a qué apunta. */
type Muestra = {
  category: string;
  question: string;
  answer: string;
  steps?: string[];
  /** Código del cronograma del documento a enlazar. */
  doc?: string;
  /** Título de la capacitación a enlazar. */
  cap?: string;
  helpful?: number;
  notHelpful?: number;
  published?: boolean;
};

const MUESTRAS: Muestra[] = [
  /* ── Sin adornos: la respuesta cabe en un párrafo ────────────────────── */
  {
    category: "Colaboración en ACC",
    question: "¿Cada cuánto debo subir mi modelo al entorno común?",
    answer:
      "Al cierre de cada jornada, y siempre antes de una revisión de coordinación. " +
      "Subir a diario evita que dos personas trabajen sobre versiones distintas del " +
      "mismo modelo, que es de donde salen casi todos los conflictos que luego hay " +
      "que resolver a mano.",
    helpful: 14,
    notHelpful: 1,
  },

  /* ── Con pasos: un procedimiento, numerado ───────────────────────────── */
  {
    category: "Colaboración en ACC",
    question: "¿Cómo publico una revisión para que el resto del equipo la vea?",
    answer:
      "La publicación es lo que hace visible tu trabajo para los demás. Mientras no " +
      "publiques, tus cambios existen solo en tu copia local.",
    steps: [
      "Guarda y sincroniza con el modelo central.",
      "En Desktop Connector, comprueba que el archivo aparezca como sincronizado.",
      "Entra a Design Collaboration y localiza tu paquete de trabajo.",
      "Pulsa «Share» y elige la carpeta del equipo que debe recibirlo.",
      "Escribe en la descripción qué cambió: es lo que leerá quien revise.",
    ],
    doc: "1.7",
    helpful: 23,
    notHelpful: 2,
  },

  /* ── Con el PDF del manual: el caso que pediste ver ──────────────────── */
  {
    category: "Revit",
    question: "¿Cómo activo las revisiones en un plano de Revit?",
    answer:
      "Las revisiones se administran desde la hoja, no desde la vista. El instructivo " +
      "lo explica con capturas paso a paso, incluida la nube de revisión y la tabla " +
      "que se rellena sola.",
    doc: "1.1",
    helpful: 31,
    notHelpful: 0,
  },

  /* ── Con capacitación: enlaza al video ───────────────────────────────── */
  {
    category: "Metodología BIM",
    question: "Soy nuevo en el equipo. ¿Por dónde empiezo?",
    answer:
      "Por la capacitación de introducción: explica cómo trabaja Sohersa antes de " +
      "entrar en ningún software. Media hora ahí ahorra muchas preguntas después.",
    cap: "Introducción a la metodología BIM",
    helpful: 42,
    notHelpful: 1,
  },

  /* ── Con documento Y capacitación a la vez ───────────────────────────── */
  {
    category: "Calidad",
    question: "¿Qué se revisa antes de entregar un juego de planos?",
    answer:
      "Hay una lista de verificación que cubre lo mínimo: nomenclatura, escalas, " +
      "cajetín, revisiones cerradas y coordinación sin conflictos abiertos. La " +
      "capacitación recorre la lista con ejemplos de lo que sí y lo que no.",
    steps: [
      "Comprueba la nomenclatura de archivos contra el estándar.",
      "Verifica que todas las revisiones estén cerradas.",
      "Corre la detección de conflictos y resuelve los críticos.",
      "Revisa el cajetín: fecha, escala, responsable y número de revisión.",
      "Exporta a PDF y ábrelo: lo que se ve mal en pantalla, se imprime mal.",
    ],
    cap: "Calidad y control de entregables",
    helpful: 18,
    notHelpful: 3,
  },

  /* ── Dynamo: otra categoría, para que se vean varias pestañas ────────── */
  {
    category: "Dynamo",
    question: "¿Necesito saber programar para usar Dynamo?",
    answer:
      "No. Dynamo es programación visual: se conectan bloques, no se escribe código. " +
      "El instructivo básico parte de cero y en un par de horas ya se automatiza una " +
      "tarea repetitiva de verdad.",
    doc: "11.1",
    helpful: 27,
    notHelpful: 2,
  },

  /* ── Sin publicar: solo la ve quien administra ───────────────────────── */
  {
    category: "Calidad",
    question: "¿Qué hago si encuentro un error en un plano ya entregado?",
    answer:
      "BORRADOR — pendiente de acordar con dirección técnica el plazo de aviso al " +
      "cliente. No publicar hasta entonces.",
    published: false,
  },
];

/** Borra lo que cargó este script. Devuelve cuántas filas quitó. */
async function borrar(c: Client): Promise<number> {
  // Los votos primero: aunque la FK es CASCADE, contarlos aparte permite
  // informar de verdad de lo que se llevó por delante.
  const votos = await c.query(
    `DELETE FROM "grid"."FaqVote" WHERE "faqId" IN
       (SELECT id FROM "grid"."FaqEntry" WHERE "createdBy" = $1)`,
    [MARCA],
  );
  const faqs = await c.query(`DELETE FROM "grid"."FaqEntry" WHERE "createdBy" = $1`, [MARCA]);
  return (votos.rowCount ?? 0) + (faqs.rowCount ?? 0);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const remota = !url.includes("localhost");
  console.log(
    `Base ${remota ? "REMOTA (¡producción!)" : "LOCAL"}\n  ${url.replace(/:[^:@]+@/, ":****@")}\n`,
  );

  const c = new Client({
    connectionString: url,
    ssl: remota ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();

  try {
    /* ── Modo borrado ─────────────────────────────────────────────────── */
    if (process.argv.includes("--borrar")) {
      const n = await borrar(c);
      console.log(n > 0 ? `Retiradas ${n} filas de muestra.` : "No había nada de muestra que quitar.");
      return;
    }

    /* ── Modo carga ───────────────────────────────────────────────────── */
    await c.query("BEGIN");

    // Se limpia lo propio antes de insertar: así correrlo dos veces deja el
    // mismo resultado en vez de duplicar la lista.
    const previas = await borrar(c);
    if (previas > 0) console.log(`(se retiraron ${previas} filas de una carga anterior)\n`);

    let n = 0;
    const sinEnlace: string[] = [];

    for (const [i, m] of MUESTRAS.entries()) {
      /*
       * Lo relacionado se resuelve CONTRA LA BASE, no se inventa.
       *
       * Si el documento o la capacitación no existieran, la FAQ se carga igual
       * pero sin el enlace, y se avisa al final: es preferible una tarjeta sin
       * botón que un botón que lleva a una pantalla de "no encontrado" delante
       * de quien está viendo la demostración.
       */
      let resourceId: string | null = null;
      let resourceCode: string | null = null;
      if (m.doc) {
        const r = await c.query(
          `SELECT id, code FROM "grid"."Resource" WHERE code = $1 LIMIT 1`,
          [m.doc],
        );
        if (r.rows[0]) {
          resourceId = r.rows[0].id;
          resourceCode = r.rows[0].code;
        } else sinEnlace.push(`documento ${m.doc} (${m.question.slice(0, 40)}…)`);
      }

      let trainingId: string | null = null;
      if (m.cap) {
        const r = await c.query(
          `SELECT id FROM "grid"."Training" WHERE title = $1 LIMIT 1`,
          [m.cap],
        );
        if (r.rows[0]) trainingId = r.rows[0].id;
        else sinEnlace.push(`capacitación "${m.cap}"`);
      }

      await c.query(
        `INSERT INTO "grid"."FaqEntry"
           (id, category, question, answer, steps, "resourceId", "resourceCode",
            "trainingId", helpful, "notHelpful", position, published, "createdBy",
            "updatedAt", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), now())`,
        [
          randomUUID(),
          m.category,
          m.question,
          m.answer,
          m.steps ?? [],
          resourceId,
          resourceCode,
          trainingId,
          m.helpful ?? 0,
          m.notHelpful ?? 0,
          i,
          m.published ?? true,
          MARCA,
        ],
      );
      n++;
    }

    await c.query("COMMIT");

    console.log(`Cargadas ${n} preguntas de muestra.\n`);

    const cats = [...new Set(MUESTRAS.map((m) => m.category))];
    console.log(`  categorías: ${cats.join(" · ")}`);
    console.log(`  con pasos numerados: ${MUESTRAS.filter((m) => m.steps).length}`);
    console.log(`  con enlace a un PDF: ${MUESTRAS.filter((m) => m.doc).length}`);
    console.log(`  con enlace a capacitación: ${MUESTRAS.filter((m) => m.cap).length}`);
    console.log(`  sin publicar (solo administración): ${MUESTRAS.filter((m) => m.published === false).length}`);

    if (sinEnlace.length > 0) {
      console.log(`\n  AVISO · no se encontró, así que van sin ese enlace:`);
      for (const s of sinEnlace) console.log(`    · ${s}`);
    }

    console.log(`\nPara quitarlas cuando termine la presentación:`);
    console.log(`  DATABASE_URL="…" npx tsx scripts/faq-demo.ts --borrar`);
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("Falló:", e.message);
  process.exit(1);
});
