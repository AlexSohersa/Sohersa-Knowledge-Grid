/**
 * Pone descripción a las capacitaciones del catálogo.
 *
 * DE DÓNDE SALE CADA UNA. No todas tienen el mismo respaldo, y conviene que
 * quede escrito aquí aunque en la ficha no se distinga:
 *
 *   · CINCO vienen de las notas de Gemini de su sesión —DISC, Design Thinking,
 *     Inteligencia emocional, Insight + Power BI y Data Connector—. Esas notas
 *     resumen lo que de verdad pasó, así que la descripción describe ESA
 *     sesión.
 *
 *   · LAS DOCE RESTANTES se redactaron a partir del título y del tema en
 *     general, porque sus notas no estaban compartidas con la cuenta que lee
 *     Drive. Describen de qué suele tratar ese asunto, no lo que se dijo en esa
 *     sesión concreta. Se hizo así por decisión expresa de quien administra el
 *     catálogo, sabiendo la diferencia.
 *
 * Quien revise una ficha y vea que la descripción no corresponde, que la
 * corrija desde Administración → Capacitaciones → Editar datos: al hacerlo
 * pasa a ser una descripción escrita por alguien que sí estuvo.
 *
 *   SOLO_LEER=si npx tsx scripts/describir-capacitaciones.ts
 *   CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/describir-capacitaciones.ts
 *
 * Es idempotente y NO pisa lo que ya tenga descripción: si alguien escribió la
 * suya, esa manda.
 */

import { Client } from "pg";

interface Desc {
  code: string;
  texto: string;
  /** `true` cuando sale de las notas reales de la sesión. */
  conNotas: boolean;
}

const DESCRIPCIONES: Desc[] = [
  {
    code: "CAP-001",
    conNotas: true,
    texto:
      "El modelo DISC aplicado al trabajo en equipo: los cuatro estilos —Dominante, " +
      "Influyente, Sensato y Correcto—, qué motiva a cada uno, qué ambiente necesita " +
      "y cómo se complementan. Incluye el test de personalidad y cómo leer sus " +
      "resultados para repartir tareas y entenderse mejor entre áreas.",
  },
  {
    code: "CAP-002",
    conNotas: true,
    texto:
      "La metodología de diseño centrado en el usuario, de la empatía al prototipo. " +
      "Recorre sus fases —empatizar, definir, idear, prototipar— con ejercicios " +
      "prácticos: mapa de empatía, matriz de soluciones y prototipado rápido. Deja " +
      "claro que el proceso importa antes que la automatización.",
  },
  {
    code: "CAP-003",
    conNotas: true,
    texto:
      "Cómo reconocer y regular las emociones en el día a día laboral. Distingue " +
      "emociones primarias y secundarias, identifica los pensamientos que magnifican " +
      "los problemas, y practica técnicas concretas: respiración, escaneo corporal y " +
      "comunicación asertiva para resolver roces antes de que crezcan.",
  },
  {
    code: "CAP-004",
    conNotas: false,
    texto:
      "Captura de la realidad para proyectos BIM: cómo levantar el estado real de un " +
      "sitio con escaneo láser y fotogrametría, y qué hacer después con esa nube de " +
      "puntos dentro del flujo de trabajo.",
  },
  {
    code: "CAP-005",
    conNotas: false,
    texto:
      "Primeros pasos en Autodesk Construction Cloud: cómo se organiza un proyecto, " +
      "dónde vive cada archivo, cómo se comparte con el equipo y qué permisos tiene " +
      "cada rol. La base para trabajar en la plataforma sin perderse.",
  },
  {
    code: "CAP-006",
    conNotas: false,
    texto:
      "Qué es un BIM Execution Plan y para qué sirve dentro de un proyecto: qué " +
      "acuerda, quién lo redacta y en qué momento. Cómo se traduce en decisiones " +
      "concretas de modelado, entregables y coordinación entre disciplinas.",
  },
  {
    code: "CAP-007",
    conNotas: false,
    texto:
      "El módulo de Model Coordination de ACC: cómo se cargan los modelos de cada " +
      "disciplina, cómo se detectan las interferencias entre ellos y cómo se " +
      "gestionan los conflictos encontrados hasta darlos por resueltos.",
  },
  {
    code: "CAP-008",
    conNotas: false,
    texto:
      "El módulo de Design Collaboration de ACC: cómo se comparte el avance del " +
      "diseño entre equipos, cómo se consume el trabajo de otras disciplinas y cómo " +
      "se sigue la línea de tiempo de un proyecto sin pisarse entre áreas.",
  },
  {
    code: "CAP-009",
    conNotas: false,
    texto:
      "Los estándares internos de Sohersa para colaborar y representar planos: " +
      "nomenclatura, criterios de representación y el proceso que sigue un juego de " +
      "planos desde que se modela hasta que se emite.",
  },
  {
    code: "CAP-010",
    conNotas: true,
    texto:
      "Autodesk Insight y los fundamentos de inteligencia de negocios: tableros, " +
      "informes automáticos y Data Connector para seguir el avance de un proyecto. " +
      "Trata el modelo BIM como una base de datos estructurada, y cubre extracción, " +
      "transformación y carga de la información.",
  },
  {
    code: "CAP-011",
    conNotas: false,
    texto:
      "Georreferenciación en proyectos BIM: cómo ubicar un modelo en sus " +
      "coordenadas reales, qué sistema de referencia usar y por qué el punto base " +
      "y el punto de reconocimiento deciden que todo encaje al vincular modelos.",
  },
  {
    code: "CAP-012",
    conNotas: false,
    texto:
      "Segunda sesión de Power BI: construcción de tableros sobre datos de proyecto. " +
      "Relaciones entre tablas, objetos visuales y filtros para pasar de una hoja de " +
      "datos a un panel que responda preguntas concretas.",
  },
  {
    code: "CAP-013",
    conNotas: true,
    texto:
      "Tercera sesión de Power BI, con Autodesk Data Connector: cómo se estructura " +
      "una base de datos, qué son las llaves primarias y foráneas, y cómo se arma un " +
      "tablero desde cero —tarjetas, gráficos de barras, línea de tiempo y columnas " +
      "calculadas— sobre un caso real de errores detectados en obra.",
  },
  {
    code: "CAP-014",
    conNotas: false,
    texto:
      "Segunda sesión de georreferenciación: casos más complejos de ubicación de " +
      "modelos, coordinación entre disciplinas con orígenes distintos y verificación " +
      "de que todo quede en su sitio.",
  },
  {
    code: "CAP-015",
    conNotas: false,
    texto:
      "Tercera sesión de georreferenciación: cierre de la serie, con la resolución " +
      "de los casos que quedaron abiertos y la comprobación del flujo completo sobre " +
      "proyectos reales.",
  },
  {
    code: "CAP-016",
    conNotas: false,
    texto:
      "Introducción a Dynamo: programación visual dentro de Revit para automatizar " +
      "tareas repetitivas. Qué es un nodo, cómo se conectan y cómo se arma un script " +
      "que haga en segundos lo que a mano llevaría horas.",
  },
  {
    code: "CAP-017",
    conNotas: false,
    texto:
      "Segunda sesión de Dynamo: scripts más elaborados, manejo de listas y lectura " +
      "y escritura de parámetros del modelo para resolver encargos concretos de " +
      "proyecto.",
  },
];

async function main() {
  if (process.env.SOLO_LEER === "si") {
    console.log("=== lo que se escribiría ===\n");
    for (const d of DESCRIPCIONES) {
      console.log(`  ${d.code}  ${d.conNotas ? "[de sus notas]  " : "[del tema]      "}`);
      console.log(`      ${d.texto.slice(0, 150)}…\n`);
    }
    const reales = DESCRIPCIONES.filter((d) => d.conNotas).length;
    console.log(`  con base en las notas de la sesión: ${reales} de ${DESCRIPCIONES.length}`);
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const destino = url.includes("localhost") ? "LOCAL" : "REMOTA (¡producción!)";
  console.log(`Describiendo capacitaciones sobre base ${destino}\n`);

  if (destino !== "LOCAL" && process.env.CONFIRMAR !== "si") {
    console.error(
      'Repite con:\n  CONFIRMAR=si DATABASE_URL="…" npx tsx scripts/describir-capacitaciones.ts',
    );
    process.exit(1);
  }

  const c = new Client({ connectionString: url });
  await c.connect();

  try {
    let puestas = 0;
    let respetadas = 0;

    for (const d of DESCRIPCIONES) {
      /*
       * No se pisa lo que ya tenga descripción.
       *
       * Si alguien que estuvo en la sesión escribió la suya, esa vale más que
       * cualquier cosa que salga de aquí. El `WHERE` lo garantiza en la base y
       * no en código, así que aunque esto se corra dos veces no hay forma de
       * borrar un texto humano por descuido.
       */
      const r = await c.query(
        `UPDATE "grid"."Training"
            SET "summary" = $2, "updatedAt" = NOW()
          WHERE "code" = $1
            AND ("summary" IS NULL OR btrim("summary") = '')`,
        [d.code, d.texto],
      );

      if (r.rowCount) {
        puestas++;
        console.log(`  ${d.code}  ${d.conNotas ? "·" : "~"} ${d.texto.slice(0, 62)}…`);
      } else {
        respetadas++;
      }
    }

    console.log(`\n  puestas: ${puestas}   ·   ya tenían la suya: ${respetadas}`);
    console.log("  · = de las notas de la sesión   ~ = del tema en general");
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
