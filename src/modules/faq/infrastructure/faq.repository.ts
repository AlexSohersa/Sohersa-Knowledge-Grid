// Módulo FAQ · INFRAESTRUCTURA · Repositorio Prisma.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import type { Faq } from "../domain/faq";
import type { DatosFaq, FiltrosFaq, RepositorioFaq } from "../application/ports";

type FilaFaq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  steps: string[];
  /* La ficha del problema. Todo opcional: solo las fichas del catálogo BIM
     lo llevan; una FAQ escrita a mano no tiene código ni captura. */
  code: string | null;
  platform: string | null;
  errorMessage: string | null;
  symptom: string | null;
  cause: string | null;
  altSteps: string[];
  recommendations: string | null;
  keywords: string[];
  imageDriveId: string | null;
  imageName: string | null;
  relatedCodes: string[];
  resourceCode: string | null;
  trainingId: string | null;
  toolId: string | null;
  fromQuestionId: string | null;
  helpful: number;
  notHelpful: number;
  position: number;
  published: boolean;
  votes?: Array<{ useful: boolean }>;
};

function aFaq(f: FilaFaq): Faq {
  return {
    id: f.id,
    category: f.category,
    question: f.question,
    answer: f.answer,
    steps: f.steps,
    code: f.code,
    platform: f.platform,
    errorMessage: f.errorMessage,
    symptom: f.symptom,
    cause: f.cause,
    altSteps: f.altSteps,
    recommendations: f.recommendations,
    keywords: f.keywords,
    imageDriveId: f.imageDriveId,
    imageName: f.imageName,
    relatedCodes: f.relatedCodes,
    resourceCode: f.resourceCode,
    trainingId: f.trainingId,
    toolId: f.toolId,
    fromQuestionId: f.fromQuestionId,
    helpful: f.helpful,
    notHelpful: f.notHelpful,
    position: f.position,
    published: f.published,
    // `votes` viene filtrado por persona: trae su voto o nada.
    miVoto: f.votes && f.votes.length > 0 ? f.votes[0].useful : null,
  };
}

export const repositorioFaq: RepositorioFaq = {
  async listar(email: string, filtros: FiltrosFaq): Promise<Faq[]> {
    if (!gridConfigured) return [];
    const filas = await gridDb()
      .faqEntry.findMany({
        where: {
          ...(filtros.incluirBorradores ? {} : { published: true }),
          ...(filtros.categoria && filtros.categoria !== "Todas"
            ? { category: filtros.categoria }
            : {}),
          ...(filtros.plataforma && filtros.plataforma !== "Todas"
            ? { platform: filtros.plataforma }
            : {}),
        },
        include: { votes: { where: { email }, select: { useful: true } } },
        /*
         * Por CÓDIGO cuando lo hay.
         *
         * Las fichas del catálogo tienen un orden que el equipo ya conoce
         * —RVT-001, RVT-002…— y respetarlo hace que buscar «la de más abajo»
         * signifique lo mismo aquí que en el Excel del área. Las que no tienen
         * código caen después, por su posición.
         */
        orderBy: [{ code: "asc" }, { category: "asc" }, { position: "asc" }],
      })
      .catch(() => [] as FilaFaq[]);
    return filas.map(aFaq);
  },

  async porId(email: string, id: string): Promise<Faq | null> {
    if (!gridConfigured) return null;
    const f = await gridDb()
      .faqEntry.findUnique({
        where: { id },
        include: { votes: { where: { email }, select: { useful: true } } },
      })
      .catch(() => null);
    return f ? aFaq(f as FilaFaq) : null;
  },

  async contenido(id: string): Promise<Faq | null> {
    if (!gridConfigured) return null;
    const f = await gridDb()
      .faqEntry.findUnique({ where: { id } })
      .catch(() => null);
    return f ? aFaq(f as FilaFaq) : null;
  },

  async crear(datos: DatosFaq, creadaPor: string): Promise<string> {
    const fila = await gridDb().faqEntry.create({
      data: {
        category: datos.category,
        question: datos.question,
        answer: datos.answer,
        steps: datos.steps ?? [],
        code: datos.code ?? null,
        platform: datos.platform ?? null,
        errorMessage: datos.errorMessage ?? null,
        symptom: datos.symptom ?? null,
        cause: datos.cause ?? null,
        altSteps: datos.altSteps ?? [],
        recommendations: datos.recommendations ?? null,
        keywords: datos.keywords ?? [],
        imageDriveId: datos.imageDriveId ?? null,
        imageName: datos.imageName ?? null,
        relatedCodes: datos.relatedCodes ?? [],
        resourceCode: datos.resourceCode ?? null,
        trainingId: datos.trainingId ?? null,
        toolId: datos.toolId ?? null,
        fromQuestionId: datos.fromQuestionId ?? null,
        position: datos.position ?? 0,
        published: datos.published ?? true,
        createdBy: creadaPor,
      },
      select: { id: true },
    });
    return fila.id;
  },

  async editar(id: string, datos: Partial<DatosFaq>): Promise<void> {
    await gridDb().faqEntry.update({ where: { id }, data: datos });
  },

  async eliminar(id: string): Promise<void> {
    await gridDb().faqEntry.delete({ where: { id } });
  },

  async votar(
    id: string,
    email: string,
    util: boolean,
  ): Promise<{ helpful: number; notHelpful: number }> {
    /*
     * El voto y los contadores tienen que moverse juntos.
     *
     * Sin transacción, un fallo entre el `upsert` y el `update` dejaría el voto
     * registrado y el contador sin sumar —o al revés—, y el número que se
     * muestra dejaría de corresponder a los votos que hay. La transacción hace
     * que ocurran las dos cosas o ninguna.
     */
    return gridDb().$transaction(async (tx) => {
      const previo = await tx.faqVote.findUnique({
        where: { faqId_email: { faqId: id, email } },
        select: { useful: true },
      });

      // Votar lo mismo dos veces no suma dos: es el mismo voto.
      if (previo?.useful === util) {
        const actual = await tx.faqEntry.findUnique({
          where: { id },
          select: { helpful: true, notHelpful: true },
        });
        return { helpful: actual?.helpful ?? 0, notHelpful: actual?.notHelpful ?? 0 };
      }

      await tx.faqVote.upsert({
        where: { faqId_email: { faqId: id, email } },
        create: { faqId: id, email, useful: util },
        update: { useful: util },
      });

      // Cambiar de opinión resta del contador anterior y suma al nuevo.
      const fila = await tx.faqEntry.update({
        where: { id },
        data: {
          helpful: { increment: util ? 1 : previo?.useful === true ? -1 : 0 },
          notHelpful: { increment: !util ? 1 : previo?.useful === false ? -1 : 0 },
        },
        select: { helpful: true, notHelpful: true },
      });

      return { helpful: fila.helpful, notHelpful: fila.notHelpful };
    });
  },

  async porPreguntaOrigen(preguntaId: string): Promise<Faq | null> {
    if (!gridConfigured) return null;
    const f = await gridDb()
      .faqEntry.findFirst({ where: { fromQuestionId: preguntaId } })
      .catch(() => null);
    return f ? aFaq(f as FilaFaq) : null;
  },
};
