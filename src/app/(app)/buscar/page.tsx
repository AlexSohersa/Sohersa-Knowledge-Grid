import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarBibliotecaWired } from "@/modules/biblioteca/infrastructure/wiring";
import { listarCapacitacionesWired } from "@/modules/capacitaciones/infrastructure/wiring";
import { listarHerramientasWired } from "@/modules/herramientas/infrastructure/wiring";
import { listarFaqWired } from "@/modules/faq/infrastructure/wiring";
import { listarPreguntasWired } from "@/modules/comunidad/infrastructure/wiring";
import { KINDS, estiloExt, extDeArchivo, type KindId } from "@/modules/shared/domain/conocimiento";
import { PageHead, EmptyState } from "@/components/ui/PageHead";
import { marcarOrigen } from "@/modules/shared/domain/procedencia";

export const revalidate = 0;

/** Un resultado, ya normalizado sea cual sea su origen. */
type Resultado = {
  kind: KindId;
  href: string;
  titulo: string;
  contexto: string;
  ext: string;
  soft: string;
  ink: string;
};

/**
 * La búsqueda global.
 *
 * Busca a la vez en los seis tipos de conocimiento y los presenta juntos, con
 * su color. Es la pantalla que justifica que el Centro sea uno solo: quien
 * busca "revisiones" no sabe —ni tiene por qué saber— si la respuesta está en
 * un manual, en un video o en una pregunta que alguien ya hizo.
 *
 * Cada módulo filtra con SU propia regla, a través de su wiring. Aquí solo se
 * mezclan los resultados.
 */
export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { q = "", tipo } = await searchParams;
  const yo = await exigirSesion();
  const consulta = q.trim();

  if (!consulta) {
    return (
      <div style={{ padding: "24px 32px 44px" }}>
        <PageHead
          icon="search"
          title="Buscar"
          description="Escribe arriba lo que necesitas encontrar"
          accent="var(--kc-teal)"
        />
        <EmptyState title="¿Qué estás buscando?">
          La búsqueda recorre a la vez los manuales, las capacitaciones, las
          herramientas, las preguntas frecuentes y la comunidad. No hace falta que
          sepas dónde está: escribe el tema y aparece.
        </EmptyState>
      </div>
    );
  }

  // Las cinco búsquedas van en paralelo: son independientes y encadenarlas
  // sumaría sus tiempos sin ganar nada.
  const [biblioteca, caps, herramientas, faq, comunidad] = await Promise.all([
    listarBibliotecaWired(yo.email, { busqueda: consulta }),
    listarCapacitacionesWired({ busqueda: consulta }),
    listarHerramientasWired({ busqueda: consulta }),
    listarFaqWired(yo.email, { busqueda: consulta }),
    listarPreguntasWired(yo.email, { busqueda: consulta }),
  ]);

  const resultados: Resultado[] = [
    ...biblioteca.secciones.flatMap((s) =>
      s.items.map((d) => {
        const e = estiloExt(extDeArchivo(d.fileName, d.mimeType));
        return {
          kind: "doc" as const,
          href: marcarOrigen(`/biblioteca/${encodeURIComponent(d.code ?? d.id)}`, "buscar", consulta),
          titulo: d.title,
          contexto: [d.section, d.author].filter(Boolean).join(" · "),
          ext: e.ext,
          soft: e.soft,
          ink: e.ink,
        };
      }),
    ),
    ...caps.items.map((cap) => ({
      kind: "cap" as const,
      href: marcarOrigen(`/capacitaciones/${cap.id}`, "buscar", consulta),
      titulo: cap.title,
      contexto: [cap.instructor, cap.duration].filter(Boolean).join(" · "),
      ext: KINDS.cap.ext,
      soft: KINDS.cap.soft,
      ink: KINDS.cap.ink,
    })),
    ...herramientas.items.map(({ herramienta: h }) => ({
      kind: "tool" as const,
      href: marcarOrigen(`/herramientas/${h.id}`, "buscar", consulta),
      titulo: h.name,
      contexto: [h.kind, h.version].filter(Boolean).join(" · "),
      ext: KINDS.tool.ext,
      soft: KINDS.tool.soft,
      ink: KINDS.tool.ink,
    })),
    ...faq.categorias.flatMap((c) =>
      c.items.map((f) => ({
        kind: "faq" as const,
        href: `/faq#${f.id}`,
        titulo: f.question,
        contexto: `FAQ · ${f.category}`,
        ext: KINDS.faq.ext,
        soft: KINDS.faq.soft,
        ink: KINDS.faq.ink,
      })),
    ),
    ...comunidad.items.map((p) => ({
      kind: "com" as const,
      href: `/comunidad/${p.id}`,
      titulo: p.title,
      contexto: `Comunidad · ${p.category} · ${p.respuestas.length} ${
        p.respuestas.length === 1 ? "respuesta" : "respuestas"
      }`,
      ext: KINDS.com.ext,
      soft: KINDS.com.soft,
      ink: KINDS.com.ink,
    })),
  ];

  const conteos: Record<string, number> = {};
  for (const r of resultados) conteos[r.kind] = (conteos[r.kind] ?? 0) + 1;

  const visibles = tipo ? resultados.filter((r) => r.kind === tipo) : resultados;

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="search"
        title={`“${consulta}”`}
        description={`${resultados.length} ${
          resultados.length === 1 ? "resultado" : "resultados"
        } en todo Sohersa Knowledge Grid`}
        accent="var(--kc-teal)"
      />

      {resultados.length === 0 ? (
        <EmptyState
          title="Nada coincide con esa búsqueda"
          action={
            <Link
              href="/comunidad/preguntar"
              className="kc-btn"
              style={{
                display: "inline-flex",
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                padding: "11px 18px",
                borderRadius: 11,
                textDecoration: "none",
                boxShadow: "var(--kc-shadow-btn)",
              }}
            >
              Preguntar a la comunidad
            </Link>
          }
        >
          Prueba con menos palabras o con otro término. Si de verdad no está
          documentado, pregúntalo: la respuesta quedará aquí para el que venga después.
        </EmptyState>
      ) : (
        <>
          {/* Pestañas por tipo: enlaces reales, para poder compartir el filtro. */}
          <nav
            aria-label="Filtrar por tipo"
            className="kc-rise"
            style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}
          >
            <PestanaTipo consulta={consulta} valor={undefined} actual={tipo}>
              Todo ({resultados.length})
            </PestanaTipo>
            {(Object.keys(conteos) as KindId[]).map((k) => (
              <PestanaTipo key={k} consulta={consulta} valor={k} actual={tipo}>
                {KINDS[k].label} ({conteos[k]})
              </PestanaTipo>
            ))}
          </nav>

          <div className="kc-panel kc-rise" style={{ overflow: "hidden" }}>
            {visibles.map((r, i) => (
              <Link
                key={`${r.kind}-${r.href}-${i}`}
                href={r.href}
                className="kc-row-h"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  padding: "13px 17px",
                  borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                  textDecoration: "none",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: r.soft,
                    color: r.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8.5,
                    fontWeight: 700,
                    flexShrink: 0,
                    letterSpacing: ".04em",
                  }}
                >
                  {r.ext}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--kc-ink)",
                      letterSpacing: "-.012em",
                    }}
                  >
                    {r.titulo}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "var(--kc-ink-3)",
                      marginTop: 3,
                    }}
                  >
                    {r.contexto}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PestanaTipo({
  consulta,
  valor,
  actual,
  children,
}: {
  consulta: string;
  valor?: string;
  actual?: string;
  children: React.ReactNode;
}) {
  const activa = actual === valor;
  const params = new URLSearchParams({ q: consulta, ...(valor ? { tipo: valor } : {}) });

  return (
    <Link
      href={`/buscar?${params}`}
      className="kc-btn"
      style={{
        border: `1px solid ${activa ? "rgba(50,214,107,.5)" : "var(--kc-line)"}`,
        background: activa ? "var(--kc-cap-soft)" : "#fff",
        color: activa ? "var(--kc-cap-ink)" : "var(--kc-ink-2)",
        fontSize: 11.5,
        fontWeight: 600,
        padding: "7px 12px",
        borderRadius: 9,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
