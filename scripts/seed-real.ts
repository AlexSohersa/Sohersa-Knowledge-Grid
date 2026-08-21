/**
 * Semilla con el material REAL de SOHERSA.
 *
 * A diferencia de `seed.ts` —que carga los datos de ejemplo del diseño—, esta
 * arma las capacitaciones a partir de lo que YA existe en el cronograma del
 * portal: las grabaciones de la sección 10, las presentaciones de la 9 y los
 * instructivos de las secciones 1 y 2.
 *
 * Cómo funciona el emparejado: una grabación y una presentación que se llaman
 * igual son la misma sesión —"Design Collaboration" tiene su video en 10.4 y
 * sus diapositivas en 9.6—, así que se juntan en un tema con el video y la
 * presentación como material. Es el emparejado que el cronograma ya expresa en
 * los títulos, sin pedirle a nadie que capture una relación nueva.
 *
 * Es IDEMPOTENTE: se puede correr varias veces sin duplicar nada.
 *
 *   npm run db:seed:real
 */

import { PrismaClient } from ".prisma/client-grid";

/*
 * Un solo cliente: con la base unificada, el cronograma y las capacitaciones
 * viven en la misma. Antes eran dos conexiones y un espejo entre medias.
 */
const db = new PrismaClient();

/** Un documento del cronograma, con lo que hace falta para armar material. */
type Doc = {
  code: string | null;
  title: string;
  section: string;
  driveId: string | null;
  url: string | null;
  author: string | null;
  fileName: string | null;
};

/**
 * Las capacitaciones que se arman, y con qué temas.
 *
 * Cada tema busca su material por el CÓDIGO del cronograma: es la llave que el
 * equipo ya usa y la que no cambia aunque alguien reescriba un título.
 */
const CAPACITACIONES = [
  {
    title: "Proceso de colaboración en ACC",
    summary:
      "El flujo completo de trabajo compartido en Autodesk Construction Cloud: cómo se publica, cómo se comparte y cómo se coordina entre disciplinas.",
    instructor: "Misael Palomera",
    instructorRole: "Líder de modelado",
    level: "Intermedio",
    category: "ACC",
    software: "ACC",
    accent: "#39B8B4",
    period: "2025",
    objectives: [
      "Entender el entorno común de datos y para qué sirve",
      "Compartir y consumir paquetes entre disciplinas",
      "Coordinar el modelo federado sin pisar el trabajo de otros",
    ],
    temas: [
      { code: "01", title: "Proceso general de colaboración", video: "10.3", docs: ["1.6"] },
      { code: "02", title: "Design Collaboration", video: "10.4", docs: ["9.6", "1.7"] },
      { code: "03", title: "Model Coordination", video: "10.2", docs: ["9.2", "1.8"] },
      {
        code: "04",
        title: "Manipulación del modelo federado",
        video: "10.17",
        docs: [],
      },
      { code: "05", title: "Plantillas para crear proyectos en ACC", video: "10.18", docs: [] },
    ],
  },
  {
    title: "Gestión documental en ACC",
    summary:
      "Revisiones, RFIs, transmittals, submittals y flujos de aprobación: todo el ciclo formal de documentos dentro de la plataforma.",
    instructor: "Misael Palomera",
    instructorRole: "Líder de modelado",
    level: "Intermedio",
    category: "ACC",
    software: "ACC",
    accent: "#3E7FA6",
    period: "2025",
    objectives: [
      "Emitir revisiones con su trazabilidad",
      "Levantar y dar seguimiento a RFIs",
      "Manejar transmittals y submittals correctamente",
    ],
    temas: [
      { code: "01", title: "Crear una revisión en ACC", video: "10.6", docs: [] },
      { code: "02", title: "Crear un flujo de aprobación", video: "10.7", docs: [] },
      { code: "03", title: "Crear un RFI", video: "10.8", docs: [] },
      { code: "04", title: "Crear un transmittal", video: "10.9", docs: [] },
      { code: "05", title: "Crear un submittal", video: "10.10", docs: [] },
      {
        code: "06",
        title: "Creación de un flujo de aprobación y revisión",
        video: "10.14",
        docs: [],
      },
    ],
  },
  {
    title: "Calidad y control de entregables",
    summary:
      "Qué se revisa antes de liberar: representación de planos, criterios de auditoría, incidencias y comparación de versiones.",
    instructor: "Misael Palomera",
    instructorRole: "Líder de modelado",
    level: "Intermedio",
    category: "Calidad",
    software: "Revit",
    accent: "#8B7CF6",
    period: "2025",
    objectives: [
      "Aplicar los criterios de calidad de planos",
      "Auditar un modelo antes de liberarlo",
      "Detectar y documentar incidencias",
    ],
    temas: [
      { code: "01", title: "Representación de planos", video: "10.1", docs: ["9.1"] },
      {
        code: "02",
        title: "Criterios para revisar la calidad de los planos",
        video: null,
        docs: ["9.7"],
      },
      {
        code: "03",
        title: "Criterios de las auditorías de los modelos",
        video: null,
        docs: ["9.8"],
      },
      {
        code: "04",
        title: "Generar incidencias en Navisworks y Revit",
        video: "10.5",
        docs: ["9.3"],
      },
      { code: "05", title: "Comparación de versiones de modelos", video: "10.11", docs: [] },
      { code: "06", title: "Comparación de versiones de planos", video: "10.12", docs: [] },
    ],
  },
  {
    title: "Introducción a la metodología BIM",
    summary:
      "El punto de partida para quien llega nuevo: qué es BIM, cómo se trabaja en Sohersa y qué se espera de cada disciplina.",
    instructor: "Misael Palomera",
    instructorRole: "Líder de modelado",
    level: "Básico",
    category: "Procesos internos",
    software: null,
    accent: "#32D66B",
    period: "2025",
    objectives: [
      "Entender qué es la metodología BIM y para qué sirve",
      "Ubicar tu rol dentro del proceso",
      "Conocer las normas de nomenclatura de la empresa",
    ],
    temas: [
      {
        code: "01",
        title: "Introducción a la metodología BIM",
        video: "10.16",
        docs: ["9.10"],
      },
      {
        code: "02",
        title: "Normas de nomenclatura y su aplicación",
        video: "10.13",
        docs: [],
      },
    ],
  },
  {
    title: "Revit: documentación y modelado",
    summary:
      "Revisiones, tablas de cuantificación, etiquetas paramétricas y modelado hidrosanitario, con sus instructivos.",
    instructor: "Misael Palomera",
    instructorRole: "Líder de modelado",
    level: "Intermedio",
    category: "Revit",
    software: "Revit",
    accent: "#E8825E",
    period: "2025",
    objectives: [
      "Emitir revisiones sin romper el juego de planos",
      "Generar tablas de cuantificación desde el modelo",
      "Crear etiquetas de anotación paramétricas",
    ],
    temas: [
      { code: "01", title: "Uso de revisiones en Revit", video: null, docs: ["1.1"] },
      { code: "02", title: "Tablas de cuantificación", video: null, docs: ["1.2"] },
      {
        code: "03",
        title: "Etiquetas de anotación paramétricas",
        video: null,
        docs: ["9.9"],
      },
      {
        code: "04",
        title: "Modelado básico hidrosanitario",
        video: null,
        docs: ["9.11", "9.12"],
      },
    ],
  },
  {
    title: "Evaluación de daños estructurales",
    summary:
      "Metodología para levantar y documentar daños estructurales, con la sesión grabada y su presentación.",
    instructor: "Francisco Rosas",
    instructorRole: "Especialista en automatización",
    level: "Avanzado",
    category: "Estructural",
    software: null,
    accent: "#F5B843",
    period: "2025",
    objectives: [
      "Levantar daños con criterio técnico",
      "Documentar la evaluación de forma trazable",
    ],
    temas: [
      {
        code: "01",
        title: "Evaluación de daños estructurales",
        video: "10.15",
        docs: ["9.4"],
      },
    ],
  },
];

/** La ruta de arranque, armada con las capacitaciones de arriba. */
const RUTA = {
  name: "Ruta BIM — Coordinación",
  objective:
    "Preparación para tomar la coordinación de un proyecto completo: del proceso general de Sohersa hasta el control de calidad de los entregables.",
  etapas: [
    {
      code: "Etapa 1",
      name: "Fundamentos",
      description: "El terreno común: cómo trabaja Sohersa y con qué reglas.",
      capacitaciones: ["Introducción a la metodología BIM"],
      documentos: ["4.1"],
    },
    {
      code: "Etapa 2",
      name: "Colaboración",
      description: "El corazón de la ruta: trabajar en el entorno común sin pisarse.",
      capacitaciones: ["Proceso de colaboración en ACC", "Gestión documental en ACC"],
      documentos: [],
    },
    {
      code: "Etapa 3",
      name: "Entrega y calidad",
      description: "Cerrar bien: revisar, auditar y liberar con evidencia.",
      capacitaciones: ["Calidad y control de entregables"],
      documentos: [],
    },
  ],
};

/** El tipo de material a partir del nombre de archivo o el MIME. */
function tipoDe(doc: Doc): string {
  const n = (doc.fileName ?? doc.title).toLowerCase();
  if (n.endsWith(".pdf")) return "PDF";
  if (n.match(/\.(pptx?|key)$/)) return "PPT";
  if (n.match(/\.(xlsx?|csv)$/)) return "XLS";
  if (n.match(/\.(rvt|rfa)$/)) return "RVT";
  if (n.match(/\.(zip|rar)$/)) return "ZIP";
  /*
   * Por omisión, PDF.
   *
   * Las presentaciones de la sección 9 están EXPORTADAS a PDF en Drive —su
   * `fileName` termina en .pdf—, así que la rama de arriba ya las resuelve. Si
   * algún día se suben como .pptx, el nombre lo dirá y esta función lo
   * detectará sola.
   */
  return "PDF";
}

async function main() {
  console.log("Sembrando con el material REAL del cronograma…\n");

  /* ── Se trae el cronograma entero, indexado por código ── */
  const docs = await db.resource.findMany({
    select: {
      code: true,
      title: true,
      section: true,
      driveId: true,
      url: true,
      author: true,
      fileName: true,
    },
  });

  const porCodigo = new Map<string, Doc>();
  for (const d of docs) if (d.code) porCodigo.set(d.code, d);

  console.log(`  Cronograma leído: ${docs.length} documentos`);

  /* ── Herramientas ── */
  const HERRAMIENTAS = [
    {
      name: "Autodesk Revit",
      kind: "Software",
      description:
        "Modelado y documentación BIM. Herramienta principal de producción en Sohersa.",
      version: "2026",
      license: "Licencia por usuario",
      discipline: "Modelado · Documentación",
      accent: "#32D66B",
      status: "DISPONIBLE",
    },
    {
      name: "Autodesk ACC",
      kind: "Plataforma",
      description:
        "Entorno común de datos: colaboración, issues y control de paquetes entre equipos.",
      version: "Cloud",
      license: "Licencia por proyecto",
      discipline: "Coordinación",
      accent: "#39B8B4",
      status: "DISPONIBLE",
    },
    {
      name: "Navisworks Manage",
      kind: "Software",
      description: "Federación de modelos y detección de interferencias para coordinación.",
      version: "2026",
      license: "Licencia por usuario",
      discipline: "Coordinación",
      accent: "#3E7FA6",
      status: "DISPONIBLE",
    },
    {
      name: "Dynamo",
      kind: "Automatización",
      description: "Programación visual para automatizar tareas repetitivas dentro de Revit.",
      version: "2.19",
      license: "Incluido con Revit",
      discipline: "Automatización",
      accent: "#8B7CF6",
      status: "DISPONIBLE",
    },
    {
      name: "Speckle",
      kind: "Plataforma",
      description: "Puente de datos entre Revit y Power BI para tableros de proyecto.",
      version: "Cloud",
      license: "Uso interno",
      discipline: "Datos",
      accent: "#F5B843",
      status: "PILOTO",
    },
    {
      name: "Agisoft Metashape",
      kind: "Software",
      description: "Fotogrametría: nubes de puntos y mallas a partir de fotografías.",
      version: "2.1",
      license: "Licencia por equipo",
      discipline: "Levantamiento",
      accent: "#E8825E",
      status: "EN_EVALUACION",
    },
    {
      name: "AutoCAD",
      kind: "Software",
      description: "Dibujo 2D para planos de apoyo, referencias y entregables heredados.",
      version: "2026",
      license: "Licencia por usuario",
      discipline: "Documentación",
      accent: "#31677F",
      status: "DISPONIBLE",
    },
  ];

  let nH = 0;
  for (const [i, h] of HERRAMIENTAS.entries()) {
    const existe = await db.tool.findFirst({ where: { name: h.name }, select: { id: true } });
    if (existe) continue;
    await db.tool.create({ data: { ...h, position: i } });
    nH++;
  }
  console.log(`  Herramientas: ${nH} nuevas de ${HERRAMIENTAS.length}`);

  /* ── Capacitaciones con material real ── */
  const capsPorTitulo = new Map<string, string>();
  let nCaps = 0;
  let nTemas = 0;
  let nMats = 0;

  for (const c of CAPACITACIONES) {
    const existe = await db.training.findFirst({
      where: { title: c.title },
      select: { id: true },
    });
    if (existe) {
      capsPorTitulo.set(c.title, existe.id);
      continue;
    }

    // Los temas se arman resolviendo cada código contra el cronograma.
    const temas = c.temas.map((t, i) => {
      const grabacion = t.video ? porCodigo.get(t.video) : null;
      const materiales = t.docs
        .map((code) => porCodigo.get(code))
        .filter((d): d is Doc => Boolean(d) && Boolean(d!.driveId || d!.url));

      return {
        code: t.code,
        title: t.title,
        kind: grabacion ? "Video" : "Presentación",
        position: i,
        // El video se incrusta desde Drive; el visor reconoce la forma del
        // enlace y elige cómo mostrarlo.
        videoUrl: grabacion?.driveId
          ? `https://drive.google.com/file/d/${grabacion.driveId}/view`
          : (grabacion?.url ?? null),
        materials: {
          create: materiales.map((d, j) => ({
            title: d.title,
            kind: tipoDe(d),
            driveId: d.driveId,
            url: d.url,
            downloadable: true,
            position: j,
          })),
        },
      };
    });

    nMats += temas.reduce((n, t) => n + t.materials.create.length, 0);
    nTemas += temas.length;

    const cap = await db.training.create({
      data: {
        title: c.title,
        summary: c.summary,
        objectives: c.objectives,
        instructor: c.instructor,
        instructorRole: c.instructorRole,
        level: c.level,
        category: c.category,
        software: c.software,
        accent: c.accent,
        period: c.period,
        status: "PUBLICADA",
        createdBy: "seed",
        topics: { create: temas },
      },
      select: { id: true },
    });

    capsPorTitulo.set(c.title, cap.id);
    nCaps++;
  }
  console.log(
    `  Capacitaciones: ${nCaps} nuevas · ${nTemas} temas · ${nMats} materiales de Drive`,
  );

  /* ── Ruta ── */
  const rutaExiste = await db.learningPath.findFirst({
    where: { name: RUTA.name },
    select: { id: true },
  });

  if (!rutaExiste) {
    await db.learningPath.create({
      data: {
        name: RUTA.name,
        objective: RUTA.objective,
        createdBy: "seed",
        stages: {
          create: RUTA.etapas.map((e, i) => ({
            code: e.code,
            name: e.name,
            description: e.description,
            position: i,
            items: {
              create: [
                ...e.capacitaciones.map((titulo, j) => ({
                  trainingId: capsPorTitulo.get(titulo) ?? null,
                  title: titulo,
                  position: j,
                })),
                ...e.documentos
                  .map((code) => porCodigo.get(code))
                  .filter((d): d is Doc => Boolean(d))
                  .map((d, j) => ({
                    resourceCode: d.code,
                    title: d.title,
                    position: e.capacitaciones.length + j,
                  })),
              ],
            },
          })),
        },
      },
    });
    console.log(`  Ruta: 1 (${RUTA.name})`);
  } else {
    console.log("  Ruta: ya existía");
  }

  console.log("\nListo.");
}

main()
  .catch((e) => {
    console.error("Falló la semilla:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
