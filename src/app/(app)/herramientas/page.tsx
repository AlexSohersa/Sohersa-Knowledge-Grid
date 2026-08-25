import Link from "next/link";
import { exigirSeccion } from "@/lib/grid/session";
import { listarHerramientasWired } from "@/modules/herramientas/infrastructure/wiring";
import { estiloAdopcion, etiquetaAdopcion } from "@/modules/herramientas/domain/herramienta";
import { EmptyState } from "@/components/ui/PageHead";
import { IconoHerramienta } from "@/components/herramientas/IconoHerramienta";

export const revalidate = 0;

/**
 * Las herramientas de la empresa.
 *
 * Cada una es una puerta a todo lo que se sabe sobre ella: sus instructivos,
 * sus capacitaciones, sus automatizaciones y las preguntas que ya se
 * resolvieron. Por eso la fila muestra contadores y no solo la ficha del
 * software.
 */
export default async function HerramientasPage() {
  await exigirSeccion("herramientas");
  const { items } = await listarHerramientasWired();

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <div className="kc-rise" style={{ marginBottom: 20, maxWidth: 720 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-.03em",
            color: "var(--kc-ink)",
            margin: 0,
          }}
        >
          Herramientas
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--kc-ink-3)",
            margin: "6px 0 0",
            lineHeight: 1.55,
          }}
        >
          Cada herramienta es un pequeño centro de conocimiento: sus instructivos, sus
          capacitaciones, sus automatizaciones y las preguntas que ya se resolvieron con
          ella.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Todavía no hay herramientas registradas">
          El catálogo lo mantiene Transformación Digital desde Administración. Aquí
          aparecerá cada software con su versión vigente, cómo se licencia y si ya es
          oficial para producción.
        </EmptyState>
      ) : (
        <div
          className="kc-panel kc-rise"
          style={{ overflow: "hidden" }}
        >
          {items.map(({ herramienta: h, conteos }, i) => {
            const adopcion = estiloAdopcion(h.status);

            return (
              <Link
                key={h.id}
                href={`/herramientas/${h.id}`}
                className="kc-row-h"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 15,
                  padding: "16px 20px",
                  borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                  textDecoration: "none",
                }}
              >
                <IconoHerramienta nombre={h.name} acento={h.accent} />

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--kc-ink)",
                        letterSpacing: "-.02em",
                      }}
                    >
                      {h.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 600,
                        color: "var(--kc-ink-3)",
                        background: "#EDF2F7",
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      {h.kind}
                    </span>
                    {h.version && (
                      <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
                        v{h.version}
                      </span>
                    )}
                    {/* El estado solo se muestra cuando NO es lo normal: si
                        todo dijera "Disponible", la etiqueta dejaría de
                        significar algo y solo añadiría ruido. */}
                    {h.status !== "DISPONIBLE" && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 600,
                          color: adopcion.ink,
                          background: adopcion.soft,
                          borderRadius: 6,
                          padding: "3px 8px",
                        }}
                      >
                        {etiquetaAdopcion(h.status)}
                      </span>
                    )}
                  </span>

                  {h.description && (
                    <span
                      className="kc-clamp-1"
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "var(--kc-ink-3)",
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {h.description}
                    </span>
                  )}
                </span>

                {/* Los contadores: lo que hay colgado de esta herramienta. */}
                <span
                  style={{
                    display: "flex",
                    gap: 22,
                    flexShrink: 0,
                    alignItems: "flex-start",
                  }}
                  className="kc-conteos"
                >
                  <Conteo n={conteos.documentos} etiqueta="documentos" />
                  <Conteo n={conteos.capacitaciones} etiqueta="capacitaciones" />
                  <Conteo n={conteos.faq} etiqueta="FAQ" />
                  <Conteo n={conteos.preguntas} etiqueta="preguntas" />
                </span>

                <span
                  aria-hidden="true"
                  style={{ color: "#C8D6E2", flexShrink: 0, display: "flex" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Un contador de la fila.
 *
 * El cero se pinta más apagado en vez de esconderse: la columna tiene que
 * quedar alineada entre filas, y un hueco vacío se lee como un error de
 * carga.
 */
function Conteo({ n, etiqueta }: { n: number; etiqueta: string }) {
  return (
    <span style={{ textAlign: "center", minWidth: 58 }}>
      <span
        style={{
          display: "block",
          fontSize: 17,
          fontWeight: 700,
          color: n > 0 ? "var(--kc-ink)" : "#C8D6E2",
          letterSpacing: "-.02em",
          lineHeight: 1.15,
        }}
      >
        {n}
      </span>
      <span style={{ display: "block", fontSize: 9.5, color: "var(--kc-ink-4)" }}>
        {etiqueta}
      </span>
    </span>
  );
}
