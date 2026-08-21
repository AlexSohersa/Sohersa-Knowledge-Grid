// Módulo Comunidad · INFRAESTRUCTURA · Repositorio Prisma.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import type { Pregunta, Respuesta } from "../domain/pregunta";
import type {
  Autor,
  DatosPregunta,
  FiltrosComunidad,
  RepositorioComunidad,
} from "../application/ports";

/**
 * Qué se trae al consultar una pregunta.
 *
 * Los votos vienen de dos formas a la vez: `_count` da el total y `votes`
 * filtrado por persona dice si quien mira ya votó. Traer todos los votos para
 * contarlos en memoria sería traer cientos de filas para obtener un número.
 */
function incluirRespuestas(email: string) {
  return {
    answers: {
      orderBy: { createdAt: "asc" as const },
      include: {
        comments: { orderBy: { createdAt: "asc" as const } },
        votes: { where: { email }, select: { id: true } },
        _count: { select: { votes: true } },
      },
    },
  };
}

type FilaComentario = {
  id: string;
  body: string;
  email: string;
  authorName: string;
  createdAt: Date;
};

type FilaRespuesta = {
  id: string;
  body: string;
  email: string;
  authorName: string;
  authorRole: string | null;
  validatedAt: Date | null;
  validatedBy: string | null;
  createdAt: Date;
  comments: FilaComentario[];
  votes: Array<{ id: string }>;
  _count: { votes: number };
};

type FilaPregunta = {
  id: string;
  title: string;
  body: string;
  email: string;
  authorName: string;
  authorRole: string | null;
  category: string;
  software: string | null;
  tags: string[];
  views: number;
  closed: boolean;
  createdAt: Date;
  updatedAt: Date;
  answers: FilaRespuesta[];
};

function aRespuesta(r: FilaRespuesta): Respuesta {
  return {
    id: r.id,
    body: r.body,
    email: r.email,
    authorName: r.authorName,
    authorRole: r.authorRole,
    validatedAt: r.validatedAt,
    validatedBy: r.validatedBy,
    votos: r._count.votes,
    // `votes` viene filtrado por persona: si trae algo, es que ya votó.
    votadaPorMi: r.votes.length > 0,
    comentarios: r.comments.map((c) => ({
      id: c.id,
      body: c.body,
      email: c.email,
      authorName: c.authorName,
      createdAt: c.createdAt,
    })),
    createdAt: r.createdAt,
  };
}

function aPregunta(p: FilaPregunta): Pregunta {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    email: p.email,
    authorName: p.authorName,
    authorRole: p.authorRole,
    category: p.category,
    software: p.software,
    tags: p.tags,
    views: p.views,
    closed: p.closed,
    respuestas: p.answers.map(aRespuesta),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const repositorioComunidad: RepositorioComunidad = {
  async listar(email: string, filtros: FiltrosComunidad): Promise<Pregunta[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .question.findMany({
        where: {
          ...(filtros.categoria && filtros.categoria !== "Todas"
            ? { category: filtros.categoria }
            : {}),
          ...(filtros.soloMias ? { email: { equals: email, mode: "insensitive" } } : {}),
        },
        include: incluirRespuestas(email),
        orderBy: { createdAt: "desc" },
      })
      .catch(() => [] as FilaPregunta[]);
    return filas.map(aPregunta);
  },

  async porId(email: string, id: string): Promise<Pregunta | null> {
    if (!gridConfigured) return null;
    const fila = await gridDb()
      .question.findUnique({ where: { id }, include: incluirRespuestas(email) })
      .catch(() => null);
    return fila ? aPregunta(fila as FilaPregunta) : null;
  },

  async crear(datos: DatosPregunta, autor: Autor): Promise<string> {
    const fila = await gridDb().question.create({
      data: {
        title: datos.title,
        body: datos.body,
        category: datos.category,
        software: datos.software ?? null,
        tags: datos.tags ?? [],
        email: autor.email,
        authorName: autor.name,
        authorRole: autor.role,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editarPregunta(id: string, datos: Partial<DatosPregunta>): Promise<void> {
    await gridDb().question.update({ where: { id }, data: datos });
  },

  async eliminarPregunta(id: string): Promise<void> {
    // Respuestas, votos y comentarios caen por `onDelete: Cascade`.
    await gridDb().question.delete({ where: { id } });
  },

  async registrarVista(id: string): Promise<void> {
    if (!gridConfigured) return;
    // Métrica: si falla, no vale la pena romper la carga de la pregunta.
    await gridDb()
      .question.update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => null);
  },

  async responder(preguntaId: string, body: string, autor: Autor): Promise<string> {
    const fila = await gridDb().answer.create({
      data: {
        questionId: preguntaId,
        body,
        email: autor.email,
        authorName: autor.name,
        authorRole: autor.role,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editarRespuesta(respuestaId: string, body: string): Promise<void> {
    await gridDb().answer.update({ where: { id: respuestaId }, data: { body } });
  },

  async eliminarRespuesta(respuestaId: string): Promise<void> {
    await gridDb().answer.delete({ where: { id: respuestaId } });
  },

  async validarRespuesta(respuestaId: string, validadaPor: string | null): Promise<void> {
    await gridDb().answer.update({
      where: { id: respuestaId },
      data: {
        // Ambos campos se mueven juntos: una respuesta validada sin fecha no
        // podría numerarse, y una fecha sin responsable no dice quién avaló.
        validatedAt: validadaPor ? new Date() : null,
        validatedBy: validadaPor,
      },
    });
  },

  async alternarVoto(respuestaId: string, email: string): Promise<number> {
    const existente = await gridDb()
      .answerVote.findUnique({
        where: { answerId_email: { answerId: respuestaId, email } },
        select: { id: true },
      })
      .catch(() => null);

    if (existente) {
      await gridDb().answerVote.delete({ where: { id: existente.id } });
    } else {
      await gridDb().answerVote.create({ data: { answerId: respuestaId, email } });
    }

    return gridDb().answerVote.count({ where: { answerId: respuestaId } });
  },

  async comentar(respuestaId: string, body: string, autor: Autor): Promise<string> {
    const fila = await gridDb().answerComment.create({
      data: { answerId: respuestaId, body, email: autor.email, authorName: autor.name },
      select: { id: true },
    });
    return fila.id;
  },

  async eliminarComentario(comentarioId: string): Promise<void> {
    await gridDb().answerComment.delete({ where: { id: comentarioId } });
  },

  async autorDeRespuesta(respuestaId: string): Promise<string | null> {
    if (!gridConfigured) return null;
    const r = await gridDb()
      .answer.findUnique({ where: { id: respuestaId }, select: { email: true } })
      .catch(() => null);
    return r?.email ?? null;
  },

  async preguntaDeRespuesta(respuestaId: string): Promise<string | null> {
    if (!gridConfigured) return null;
    const r = await gridDb()
      .answer.findUnique({ where: { id: respuestaId }, select: { questionId: true } })
      .catch(() => null);
    return r?.questionId ?? null;
  },
};
