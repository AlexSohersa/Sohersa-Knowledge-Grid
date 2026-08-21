/**
 * Semilla de Sohersa Knowledge Grid.
 *
 * Carga los datos reales que trae el diseño: las herramientas de la empresa,
 * las capacitaciones con sus temas, la ruta de coordinación BIM, las preguntas
 * frecuentes y las conversaciones de la comunidad.
 *
 * Es IDEMPOTENTE: se puede correr varias veces sin duplicar nada. Cada entidad
 * se busca antes de crearse, porque en un despliegue real es fácil que alguien
 * lo ejecute dos veces y acabar con dos catálogos iguales sería peor que no
 * tener ninguno.
 *
 *   npm run db:seed
 */

import { PrismaClient } from ".prisma/client-grid";

const db = new PrismaClient();

/** Los correos del equipo que aparecen en el diseño. */
const CORREO = (nombre: string) =>
  `${nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(".")}@gruposohersa.com`;

/* ── Herramientas ───────────────────────────────────────────────────────── */

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
    name: "Sohersa Tools",
    kind: "Interno",
    description:
      "Paquete propio de scripts y complementos desarrollado por Transformación Digital.",
    version: "1.4",
    license: "Uso interno",
    discipline: "Automatización",
    accent: "#F5B843",
    // En piloto: es desarrollo propio y todavía se está estabilizando.
    status: "PILOTO",
  },
  {
    name: "AutoCAD",
    kind: "Software",
    description: "Dibujo 2D para planos de apoyo, referencias y entregables heredados.",
    version: "2026",
    license: "Licencia por usuario",
    discipline: "Documentación",
    accent: "#E8825E",
    status: "DISPONIBLE",
  },
];

/* ── Capacitaciones ─────────────────────────────────────────────────────── */

const CAPACITACIONES = [
  {
    title: "Documentación y revisiones en Revit",
    summary:
      "Emite juegos de planos confiables: revisiones, láminas y exportación con estándar Sohersa.",
    instructor: "Misael Palomera",
    instructorRole: "Líder de modelado",
    duration: "2 h 40 min",
    durationMin: 160,
    level: "Intermedio",
    category: "Revit",
    software: "Revit",
    accent: "#32D66B",
    period: "ago 2026",
    views: 186,
    objectives: [
      "Emitir revisiones sin romper el juego de planos",
      "Aplicar la nomenclatura de láminas de Sohersa",
      "Exportar planos validados a PDF y DWG",
    ],
    temas: [
      {
        code: "01",
        title: "Introducción y alcance",
        duration: "12 min",
        kind: "Video",
        materials: [{ title: "Presentación de arranque", kind: "PPT" }],
      },
      {
        code: "02",
        title: "Juegos de planos y láminas",
        duration: "34 min",
        kind: "Video",
        materials: [{ title: "SOH-REV-008 Nomenclatura", kind: "PDF" }],
      },
      {
        code: "03",
        title: "Revisiones: emisión y control",
        duration: "46 min",
        kind: "Video",
        materials: [
          { title: "SOH-REV-013 Instructivo", kind: "PDF" },
          { title: "Ejercicio guiado", kind: "ZIP" },
        ],
      },
      {
        code: "04",
        title: "Exportación y validación",
        duration: "38 min",
        kind: "Video",
        materials: [{ title: "SOH-REV-016 Exportación", kind: "PDF" }],
      },
      {
        code: "05",
        title: "Ejercicio final y cierre",
        duration: "30 min",
        kind: "Ejercicio",
        materials: [{ title: "Plantilla de entrega", kind: "RVT" }],
      },
    ],
  },
  {
    title: "Coordinación BIM con ACC",
    summary:
      "Flujo completo de colaboración: paquetes compartidos, issues y sesiones de coordinación.",
    instructor: "Marisol Cano",
    instructorRole: "Coordinadora BIM",
    duration: "3 h 10 min",
    durationMin: 190,
    level: "Intermedio",
    category: "ACC",
    software: "ACC",
    accent: "#39B8B4",
    period: "jul 2026",
    views: 154,
    objectives: [
      "Configurar el entorno común de datos",
      "Gestionar issues con responsables y evidencia",
      "Dirigir una sesión de coordinación efectiva",
    ],
    temas: [
      { code: "01", title: "El entorno común de datos", duration: "22 min", kind: "Video", materials: [] },
      {
        code: "02",
        title: "Design Collaboration",
        duration: "40 min",
        kind: "Video",
        materials: [{ title: "SOH-ACC-004 Manual", kind: "PDF" }],
      },
      {
        code: "03",
        title: "Issues y ciclo de revisión",
        duration: "36 min",
        kind: "Video",
        materials: [{ title: "SOH-ACC-011 Gestión", kind: "PDF" }],
      },
      { code: "04", title: "Sesiones de coordinación", duration: "32 min", kind: "Video", materials: [] },
      { code: "05", title: "Reportes a disciplinas", duration: "28 min", kind: "Presentación", materials: [] },
      { code: "06", title: "Cierre y buenas prácticas", duration: "32 min", kind: "Video", materials: [] },
    ],
  },
  {
    title: "Dynamo desde cero",
    summary:
      "Automatiza lo repetitivo con programación visual: nodos, listas y tus primeros scripts útiles.",
    instructor: "Francisco Rosas",
    instructorRole: "Especialista en automatización",
    duration: "4 h 20 min",
    durationMin: 260,
    level: "Básico",
    category: "Dynamo",
    software: "Dynamo",
    accent: "#8B7CF6",
    period: "jul 2026",
    views: 212,
    objectives: [
      "Entender nodos, cables y flujo de datos",
      "Manipular listas sin perder la cabeza",
      "Automatizar el numerado de locales",
    ],
    temas: [
      { code: "01", title: "Qué es Dynamo y para qué sirve", duration: "26 min", kind: "Video", materials: [] },
      { code: "02", title: "Nodos y flujo de datos", duration: "34 min", kind: "Video", materials: [] },
      { code: "03", title: "Listas y estructuras", duration: "40 min", kind: "Video", materials: [] },
      { code: "04", title: "Primer script útil", duration: "44 min", kind: "Ejercicio", materials: [] },
    ],
  },
  {
    title: "Estándares de calidad del modelo",
    summary:
      "Qué revisamos antes de liberar un modelo y cómo evitar los errores que más se repiten.",
    instructor: "Regina Ortiz",
    instructorRole: "Líder de Transformación Digital",
    duration: "1 h 30 min",
    durationMin: 90,
    level: "Básico",
    category: "Calidad",
    software: "Navisworks",
    accent: "#3E7FA6",
    period: "jun 2026",
    views: 143,
    objectives: [
      "Aplicar el checklist de calidad",
      "Detectar los errores más comunes",
      "Documentar la liberación del modelo",
    ],
    temas: [
      { code: "01", title: "Por qué falla un modelo", duration: "20 min", kind: "Video", materials: [] },
      {
        code: "02",
        title: "El checklist de Sohersa",
        duration: "28 min",
        kind: "Video",
        materials: [{ title: "SOH-EST-007 Checklist", kind: "XLS" }],
      },
      { code: "03", title: "Revisión en Navisworks", duration: "26 min", kind: "Video", materials: [] },
      { code: "04", title: "Liberación y evidencia", duration: "16 min", kind: "Video", materials: [] },
    ],
  },
  {
    title: "Introducción al proceso BIM en Sohersa",
    summary:
      "Cómo trabajamos: roles, entregables, plataformas y qué se espera de cada disciplina.",
    instructor: "Regina Ortiz",
    instructorRole: "Líder de Transformación Digital",
    duration: "1 h 10 min",
    durationMin: 70,
    level: "Básico",
    category: "Procesos internos",
    software: null,
    accent: "#32D66B",
    period: "jun 2026",
    views: 268,
    objectives: [
      "Ubicar tu rol dentro del proceso",
      "Conocer los entregables por fase",
      "Saber dónde vive cada información",
    ],
    temas: [
      { code: "01", title: "El proceso de punta a punta", duration: "24 min", kind: "Video", materials: [] },
      { code: "02", title: "Roles y responsabilidades", duration: "22 min", kind: "Video", materials: [] },
      { code: "03", title: "Plataformas que usamos", duration: "24 min", kind: "Video", materials: [] },
    ],
  },
  {
    title: "Liderazgo técnico para coordinadores",
    summary:
      "Conducir juntas difíciles, dar retroalimentación y sostener al equipo en semanas pesadas.",
    instructor: "Regina Ortiz",
    instructorRole: "Líder de Transformación Digital",
    duration: "2 h",
    durationMin: 120,
    level: "Avanzado",
    category: "Liderazgo",
    software: null,
    accent: "#E8825E",
    period: "may 2026",
    views: 97,
    objectives: [
      "Conducir una junta de decisiones",
      "Dar retroalimentación concreta",
      "Detectar sobrecarga en el equipo",
    ],
    temas: [
      {
        code: "01",
        title: "De junta de reporte a junta de decisiones",
        duration: "26 min",
        kind: "Video",
        materials: [],
      },
      { code: "02", title: "Retroalimentación que sí sirve", duration: "24 min", kind: "Video", materials: [] },
    ],
  },
];

/* ── Ruta de aprendizaje ────────────────────────────────────────────────── */

/**
 * Un elemento de la ruta.
 *
 * Se declara como unión discriminada —capacitación o documento— para que el
 * compilador garantice que siempre hay título y que nunca se ponen las dos
 * referencias a la vez, que es justo lo que el dominio prohíbe.
 */
type ItemSemilla =
  | { tipo: "cap"; capTitulo: string; duration: string }
  | { tipo: "doc"; resourceCode: string; title: string; duration: string };

const RUTA: {
  name: string;
  objective: string;
  etapas: {
    code: string;
    name: string;
    description: string;
    items: ItemSemilla[];
  }[];
} = {
  name: "Ruta BIM — Coordinación",
  objective: "Preparación para tomar la coordinación de un proyecto completo.",
  etapas: [
    {
      code: "Etapa 1",
      name: "Fundamentos",
      description: "El terreno común: cómo trabaja Sohersa y con qué reglas.",
      items: [
        { tipo: "cap", capTitulo: "Introducción al proceso BIM en Sohersa", duration: "1 h 10 min" },
        { tipo: "doc", resourceCode: "4.1", title: "Estándar de nomenclatura de archivos", duration: "20 min" },
        { tipo: "cap", capTitulo: "Documentación y revisiones en Revit", duration: "2 h 40 min" },
      ],
    },
    {
      code: "Etapa 2",
      name: "Coordinación",
      description: "El corazón de la ruta: colaborar y resolver en el entorno común.",
      items: [
        { tipo: "cap", capTitulo: "Coordinación BIM con ACC", duration: "3 h 10 min" },
        { tipo: "doc", resourceCode: "2.3", title: "Gestión de incidencias y observaciones", duration: "25 min" },
        { tipo: "cap", capTitulo: "Dynamo desde cero", duration: "4 h 20 min" },
      ],
    },
    {
      code: "Etapa 3",
      name: "Entrega",
      description: "Cerrar bien: calidad, evidencia y traspaso a obra.",
      items: [
        { tipo: "cap", capTitulo: "Estándares de calidad del modelo", duration: "1 h 30 min" },
        { tipo: "cap", capTitulo: "Liderazgo técnico para coordinadores", duration: "2 h" },
      ],
    },
  ],
};

/* ── Preguntas frecuentes ───────────────────────────────────────────────── */

const FAQS = [
  {
    category: "Revit",
    question: "¿Cómo cambio una revisión que ya fue emitida?",
    answer:
      "Una revisión emitida se bloquea a propósito para conservar el historial del plano. No la edites: crea una revisión nueva que documente el cambio.",
    steps: [
      "Abre el juego de planos y verifica cuál fue la última revisión emitida.",
      "Crea una nueva revisión con la fecha real de emisión.",
      "Agrega la nube y la etiqueta sobre el área modificada.",
      "Vuelve a emitir el juego y notifica en el issue correspondiente.",
    ],
    resourceCode: "1.1",
    helpful: 42,
  },
  {
    category: "Revit",
    question: "¿Por qué mis láminas no siguen la nomenclatura correcta?",
    answer:
      "La nomenclatura se toma de los parámetros del juego de planos, no del nombre del archivo. Si el parámetro está vacío o escrito a mano, el nombre sale mal.",
    steps: [
      "Revisa los parámetros de disciplina y fase en el juego de planos.",
      "Aplica la plantilla SOH-REV-005 si el proyecto es nuevo.",
      "Vuelve a generar el nombre desde el juego, no desde la lámina.",
    ],
    resourceCode: "4.1",
    helpful: 31,
  },
  {
    category: "ACC",
    question: "¿Cuál es la diferencia entre compartir y publicar un paquete?",
    answer:
      "Publicar actualiza el modelo dentro de tu propio equipo. Compartir lo pone a disposición de las otras disciplinas como paquete consumible.",
    steps: [
      "Publica cuando termines una jornada de modelado.",
      "Comparte solo cuando el modelo esté listo para que otros lo consuman.",
      "Documenta en el paquete qué cambió respecto al anterior.",
    ],
    resourceCode: "2.2",
    helpful: 27,
  },
  {
    category: "ACC",
    question: "¿Quién debe cerrar un issue de coordinación?",
    answer:
      "Lo cierra quien lo abrió, una vez que verifica la corrección en el modelo. La disciplina responsable lo marca como resuelto, pero no lo cierra.",
    steps: [
      "La disciplina corrige y marca el issue como resuelto.",
      "Quien lo abrió verifica en el modelo actualizado.",
      "Si está correcto, lo cierra con evidencia adjunta.",
    ],
    resourceCode: "2.3",
    helpful: 19,
  },
  {
    category: "Procesos",
    question: "¿Dónde registro las horas que dedico a un proyecto?",
    answer:
      "En el Gestor de actividad de la Plataforma de Conexión, con el código de proyecto correspondiente. El Sohersa Knowledge Grid no registra horas.",
    steps: [
      "Entra a la Plataforma de Conexión.",
      "Abre el Gestor de actividad y elige la fecha.",
      "Selecciona el proyecto y captura entregable, tipo y horas.",
    ],
    helpful: 36,
  },
  {
    category: "Software",
    question: "¿Cómo solicito una licencia de Navisworks?",
    answer:
      "La licencia se solicita a Transformación Digital con el visto bueno de tu líder. La asignación tarda hasta dos días hábiles.",
    steps: [
      "Levanta un ticket en la Plataforma de Conexión.",
      "Indica el proyecto y por qué la necesitas.",
      "Espera la confirmación de asignación.",
    ],
    herramienta: "Navisworks Manage",
    helpful: 22,
  },
  {
    category: "Calidad",
    question: "¿Qué reviso antes de liberar un modelo?",
    answer:
      "El checklist de control de calidad es obligatorio. Sin él, coordinación puede rechazar la entrega.",
    steps: [
      "Descarga el checklist SOH-EST-007.",
      "Verifica cada punto en el modelo.",
      "Adjunta el checklist firmado a la liberación.",
    ],
    resourceCode: "4.2",
    helpful: 29,
  },
];

/* ── Comunidad ──────────────────────────────────────────────────────────── */

const PREGUNTAS = [
  {
    title: "Las revisiones no aparecen en la lámina aunque ya las emití",
    body: "Emití la revisión 3 en el juego de planos ARQ y la nube ya está colocada sobre el cambio, pero en la lámina la tabla de revisiones sigue mostrando solo hasta la 2. Ya cerré y volví a abrir el archivo. Estoy en Revit 2026 con la plantilla de Sohersa.",
    authorName: "Alejandro Orozco",
    authorRole: "Coordinación BIM",
    category: "Revit",
    software: "Revit",
    tags: ["Revit", "Documentación", "Revisiones"],
    views: 96,
    respuestas: [
      {
        authorName: "Misael Palomera",
        authorRole: "Líder de modelado",
        body: "La tabla de revisiones de la lámina solo muestra las revisiones que tienen al menos una nube visible en esa vista. Si la nube quedó en otra vista del mismo juego, la lámina no la reporta. Revisa en qué vista colocaste la nube: seguramente está en un plano de referencia y no en la vista que compone la lámina.",
        validada: true,
        votos: 12,
        comentarios: [
          {
            authorName: "Alejandro Orozco",
            body: "Era exactamente eso, la nube estaba en la vista de referencia. Gracias.",
          },
        ],
      },
      {
        authorName: "Andrea Vega",
        authorRole: "Líder de proyectos",
        body: "Agrego una segunda vía válida: si necesitas que la revisión aparezca en todo el juego sin depender de nubes, cambia la numeración a “por juego de planos” en lugar de “por proyecto”. Así la tabla toma la revisión del juego completo. Es lo que hacemos en proyectos grandes.",
        validada: true,
        votos: 8,
        comentarios: [],
      },
      {
        authorName: "Ramón Inzunza",
        authorRole: "Analista de cuantificación",
        body: "A mí me pasó algo parecido y lo resolví purgando el archivo, aunque no estoy seguro de que fuera la causa real.",
        validada: false,
        votos: 1,
        comentarios: [],
      },
    ],
  },
  {
    title: "¿Cómo evito que se dupliquen los paquetes compartidos en ACC?",
    body: "Cada semana terminamos con dos paquetes casi idénticos y las otras disciplinas no saben cuál consumir. ¿Hay alguna forma de forzar un solo paquete por semana?",
    authorName: "Marisol Cano",
    authorRole: "Coordinadora BIM",
    category: "ACC",
    software: "ACC",
    tags: ["ACC", "Colaboración"],
    views: 54,
    respuestas: [
      {
        authorName: "Andrea Vega",
        authorRole: "Líder de proyectos",
        body: "No se fuerza desde la plataforma, se resuelve con acuerdo: un solo responsable por disciplina comparte, y siempre el mismo día. Nosotros dejamos el jueves como día de paquete y nombramos con la fecha. Desde entonces no hay duplicados.",
        validada: true,
        votos: 9,
        comentarios: [],
      },
    ],
  },
  {
    title: "El script de numerado de locales falla cuando hay niveles repetidos",
    body: "Uso el script de Sohersa Tools para numerar locales y truena cuando el proyecto tiene dos niveles con el mismo nombre. ¿Alguien lo ha adaptado?",
    authorName: "Ramón Inzunza",
    authorRole: "Analista de cuantificación",
    category: "Dynamo",
    software: "Dynamo",
    tags: ["Dynamo", "Automatización"],
    views: 38,
    respuestas: [
      {
        authorName: "Francisco Rosas",
        authorRole: "Especialista en automatización",
        body: "Es un tema conocido: el nodo agrupa por nombre de nivel y no por elevación. Estoy preparando una versión que agrupe por elevación. Mientras tanto renombra temporalmente el nivel duplicado.",
        validada: false,
        votos: 5,
        comentarios: [],
      },
    ],
  },
  {
    title: "¿Existe una plantilla de presentación para entregas a cliente?",
    body: "Necesito presentar el avance del Hospital Ángeles y no quiero armar el formato desde cero. ¿Tenemos algo oficial?",
    authorName: "Andrea Vega",
    authorRole: "Líder de proyectos",
    category: "Procesos",
    software: null,
    tags: ["Presentaciones", "Entregables"],
    views: 21,
    respuestas: [],
  },
];

/* ── Ejecución ──────────────────────────────────────────────────────────── */

async function main() {
  console.log("Sembrando Sohersa Knowledge Grid…\n");

  /* Herramientas */
  const herramientasPorNombre = new Map<string, string>();
  for (const [i, h] of HERRAMIENTAS.entries()) {
    const existente = await db.tool.findFirst({ where: { name: h.name }, select: { id: true } });
    if (existente) {
      herramientasPorNombre.set(h.name, existente.id);
      continue;
    }
    const fila = await db.tool.create({
      data: { ...h, position: i },
      select: { id: true },
    });
    herramientasPorNombre.set(h.name, fila.id);
  }
  console.log(`  Herramientas: ${herramientasPorNombre.size}`);

  /* Capacitaciones con sus temas y materiales */
  const capsPorTitulo = new Map<string, string>();
  for (const c of CAPACITACIONES) {
    const existente = await db.training.findFirst({
      where: { title: c.title },
      select: { id: true },
    });
    if (existente) {
      capsPorTitulo.set(c.title, existente.id);
      continue;
    }

    const { temas, ...datos } = c;
    const cap = await db.training.create({
      data: {
        ...datos,
        // Se publican: son las capacitaciones que el equipo ya impartió.
        status: "PUBLICADA",
        createdBy: CORREO(c.instructor),
        topics: {
          create: temas.map((t, i) => ({
            code: t.code,
            title: t.title,
            kind: t.kind,
            duration: t.duration,
            position: i,
            materials: {
              create: t.materials.map((m, j) => ({
                title: m.title,
                kind: m.kind,
                position: j,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
    capsPorTitulo.set(c.title, cap.id);
  }
  console.log(`  Capacitaciones: ${capsPorTitulo.size}`);

  /* Ruta de aprendizaje */
  const rutaExistente = await db.learningPath.findFirst({
    where: { name: RUTA.name },
    select: { id: true },
  });

  if (!rutaExistente) {
    await db.learningPath.create({
      data: {
        name: RUTA.name,
        objective: RUTA.objective,
        stages: {
          create: RUTA.etapas.map((e, i) => ({
            code: e.code,
            name: e.name,
            description: e.description,
            position: i,
            items: {
              create: e.items.map((item, j) => ({
                // Un elemento apunta a una capacitación O a un documento, nunca
                // a los dos: el dominio los trata como alternativas.
                trainingId:
                  "capTitulo" in item ? (capsPorTitulo.get(item.capTitulo) ?? null) : null,
                resourceCode: "resourceCode" in item ? item.resourceCode : null,
                title: "capTitulo" in item ? item.capTitulo : item.title,
                duration: item.duration,
                position: j,
              })),
            },
          })),
        },
      },
    });
    console.log("  Ruta: 1 (Ruta BIM — Coordinación)");
  } else {
    console.log("  Ruta: ya existía");
  }

  /* Preguntas frecuentes */
  let faqsCreadas = 0;
  for (const [i, f] of FAQS.entries()) {
    const existente = await db.faqEntry.findFirst({
      where: { question: f.question },
      select: { id: true },
    });
    if (existente) continue;

    const { herramienta, ...datos } = f;
    await db.faqEntry.create({
      data: {
        ...datos,
        toolId: herramienta ? (herramientasPorNombre.get(herramienta) ?? null) : null,
        position: i,
        published: true,
      },
    });
    faqsCreadas++;
  }
  console.log(`  Preguntas frecuentes: ${faqsCreadas} nuevas de ${FAQS.length}`);

  /* Comunidad */
  let preguntasCreadas = 0;
  for (const p of PREGUNTAS) {
    const existente = await db.question.findFirst({
      where: { title: p.title },
      select: { id: true },
    });
    if (existente) continue;

    const { respuestas, ...datos } = p;
    const pregunta = await db.question.create({
      data: { ...datos, email: CORREO(p.authorName) },
      select: { id: true },
    });

    for (const r of respuestas) {
      const respuesta = await db.answer.create({
        data: {
          questionId: pregunta.id,
          body: r.body,
          email: CORREO(r.authorName),
          authorName: r.authorName,
          authorRole: r.authorRole,
          // Las validadas llevan fecha: es lo que las numera como "Solución 1",
          // "Solución 2" en el orden en que se aprobaron.
          validatedAt: r.validada ? new Date() : null,
          validatedBy: r.validada ? CORREO("Regina Ortiz") : null,
          comments: {
            create: r.comentarios.map((c) => ({
              body: c.body,
              email: CORREO(c.authorName),
              authorName: c.authorName,
            })),
          },
        },
        select: { id: true },
      });

      /*
       * Los votos se crean como filas reales, una por persona ficticia, en vez
       * de escribir un número: el contador se DERIVA de estas filas, así que un
       * número suelto no se vería en la interfaz.
       */
      for (let v = 0; v < r.votos; v++) {
        await db.answerVote.create({
          data: { answerId: respuesta.id, email: `demo${v}@gruposohersa.com` },
        });
      }
    }
    preguntasCreadas++;
  }
  console.log(`  Comunidad: ${preguntasCreadas} nuevas de ${PREGUNTAS.length}`);

  console.log("\nListo.");
}

main()
  .catch((e) => {
    console.error("Falló la semilla:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
