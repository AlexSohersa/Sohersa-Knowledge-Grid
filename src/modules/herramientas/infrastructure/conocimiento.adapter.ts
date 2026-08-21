// Módulo Herramientas · INFRAESTRUCTURA · Adaptador de conocimiento.
//
// Implementa el port `ConocimientoPorHerramienta`: cuenta qué hay colgado de
// cada herramienta en los otros cuatro módulos.
//
// Vive en la infraestructura de Herramientas —y no dentro de cada módulo—
// porque es una consulta de LECTURA que cruza fronteras. Ponerla aquí mantiene
// la regla que importa: la aplicación de Herramientas depende del contrato, no
// de estas tablas.

import "server-only";

import { gridConfigured, gridDb } from "@/lib/grid/db";
import { portalConfigured, portalDb } from "@/lib/portal/db";
import { normalizar } from "@/modules/biblioteca/domain/documento";
import type { Herramienta } from "../domain/herramienta";
import type {
  ConocimientoPorHerramienta,
  ConteosHerramienta,
} from "../application/ports";

/**
 * Si un texto menciona una herramienta.
 *
 * El cruce es por NOMBRE y no por una llave foránea a propósito: los
 * documentos del cronograma y las capacitaciones nombran el software en texto
 * libre ("Revit 2024", "instructivo de ACC"), y exigir que alguien capture un
 * id por cada uno haría que la relación nunca estuviera completa.
 *
 * Se compara sin acentos y en minúsculas, con el nombre corto: "Autodesk
 * Revit" también encuentra los que solo dicen "Revit".
 */
function menciona(texto: string, nombres: string[]): boolean {
  const heno = normalizar(texto);
  return nombres.some((n) => heno.includes(n));
}

/**
 * Las formas en que se nombra una herramienta.
 *
 * Del nombre completo se derivan las variantes útiles: "Autodesk Revit" da
 * también "revit", que es como lo escribe la gente. Se descartan las palabras
 * genéricas —"autodesk" sola encontraría AutoCAD, Navisworks y ACC a la vez—.
 */
const GENERICAS = new Set(["autodesk", "manage", "de", "y", "para"]);

function nombresDe(h: Herramienta): string[] {
  const completo = normalizar(h.name);
  const partes = completo.split(/\s+/).filter((p) => p.length > 2 && !GENERICAS.has(p));
  return [...new Set([completo, ...partes])];
}

export const conocimientoPorHerramienta: ConocimientoPorHerramienta = {
  async contar(herramientas: Herramienta[]): Promise<Map<string, ConteosHerramienta>> {
    const resultado = new Map<string, ConteosHerramienta>();
    if (herramientas.length === 0) return resultado;

    /*
     * Se trae UNA vez lo que hay y se cruza en memoria.
     *
     * La alternativa —una consulta `contains` por herramienta y por módulo—
     * serían 24 consultas para seis herramientas. Los volúmenes son de
     * decenas de filas, así que traerlas y compararlas aquí es más rápido y
     * más simple.
     */
    const [documentos, capacitaciones, faqs, preguntas] = await Promise.all([
      portalConfigured
        ? portalDb()
            .resource.findMany({ select: { title: true, section: true, fileName: true } })
            .catch(() => [])
        : Promise.resolve([]),
      gridConfigured
        ? gridDb()
            .training.findMany({
              where: { status: "PUBLICADA" },
              select: { title: true, software: true, category: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      gridConfigured
        ? gridDb()
            .faqEntry.findMany({
              where: { published: true },
              select: { question: true, answer: true, category: true, toolId: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      gridConfigured
        ? gridDb()
            .question.findMany({ select: { title: true, body: true, software: true, tags: true } })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    for (const h of herramientas) {
      const nombres = nombresDe(h);

      resultado.set(h.id, {
        documentos: documentos.filter((d) =>
          menciona([d.title, d.section, d.fileName].filter(Boolean).join(" "), nombres),
        ).length,

        capacitaciones: capacitaciones.filter((c) =>
          menciona([c.title, c.software, c.category].filter(Boolean).join(" "), nombres),
        ).length,

        // La FAQ puede apuntar a la herramienta explícitamente (`toolId`); esa
        // relación manda sobre la coincidencia por texto.
        faq: faqs.filter(
          (f) =>
            f.toolId === h.id ||
            menciona([f.question, f.answer, f.category].filter(Boolean).join(" "), nombres),
        ).length,

        preguntas: preguntas.filter((p) =>
          menciona([p.title, p.body, p.software, ...p.tags].filter(Boolean).join(" "), nombres),
        ).length,
      });
    }

    return resultado;
  },
};
