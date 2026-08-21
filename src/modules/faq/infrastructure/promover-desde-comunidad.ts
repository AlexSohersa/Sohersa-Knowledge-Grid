// Módulo FAQ · INFRAESTRUCTURA · Adaptador para Comunidad.
//
// Implementa el port `PromoverAFaq` que declara el módulo de Comunidad. Es el
// mismo patrón que usa Deal Engine entre Leads y Oportunidades: el módulo que
// necesita algo declara el contrato, y el módulo que sabe hacerlo lo implementa.
//
// Gracias a esto, Comunidad no conoce las tablas de FAQ. Si mañana cambia cómo
// se crean las preguntas frecuentes, Comunidad no se entera.

import "server-only";

import { repositorioFaq } from "./faq.repository";
import type { PromoverAFaq } from "@/modules/comunidad/application/ports";

export const promoverAFaq: PromoverAFaq = {
  async promover(datos): Promise<{ faqId: string }> {
    /*
     * Promover dos veces la misma pregunta no crea dos FAQ.
     *
     * Puede pasar sin mala intención: dos administradores mirando la misma
     * pregunta, o un doble clic. Devolver la que ya existe hace la operación
     * idempotente y evita respuestas oficiales duplicadas, que es justo lo que
     * la FAQ no debe tener.
     */
    const existente = await repositorioFaq.porPreguntaOrigen(datos.preguntaId);
    if (existente) return { faqId: existente.id };

    const faqId = await repositorioFaq.crear(
      {
        category: datos.category,
        question: datos.question,
        answer: datos.answer,
        fromQuestionId: datos.preguntaId,
        // Nace publicada: viene de una respuesta que administración ya validó,
        // así que el contenido está revisado.
        published: true,
      },
      datos.creadaPor,
    );

    return { faqId };
  },
};
