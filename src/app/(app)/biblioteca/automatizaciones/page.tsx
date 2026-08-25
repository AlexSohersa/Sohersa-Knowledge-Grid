import { exigirSeccion } from "@/lib/grid/session";
import { listarAutomatizacionesWired } from "@/modules/biblioteca/infrastructure/wiring";
import { haceCuanto, tamano } from "@/modules/shared/domain/formato";
import { BibliotecaTabs } from "@/components/biblioteca/BibliotecaTabs";
import { EmptyState } from "@/components/ui/PageHead";
import { Pill } from "@/components/ui/Pill";

export const revalidate = 0;

/**
 * Automatizaciones: scripts de Dynamo, paquetes y complementos internos.
 *
 * Es la otra mitad de la biblioteca. A diferencia de los manuales, esto NO
 * viene del cronograma: se sube desde Digital Core y aquí se consulta.
 */
export default async function AutomatizacionesPage() {
  await exigirSeccion("biblioteca");
  const items = await listarAutomatizacionesWired();

  return (
    <div style={{ padding: "24px 30px 44px" }}>
      <div className="kc-rise" style={{ marginBottom: 14 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-.03em",
            color: "var(--kc-ink)",
            margin: 0,
          }}
        >
          Biblioteca
        </h1>
        <p style={{ fontSize: 12.5, color: "var(--kc-ink-3)", margin: "5px 0 0" }}>
          Manuales, instructivos, estándares, plantillas y material de capacitación
        </p>
      </div>

      <BibliotecaTabs />

      {items.length === 0 ? (
        <EmptyState title="Todavía no hay automatizaciones">
          Los scripts de Dynamo y los paquetes internos se suben desde la plataforma
          Digital Core. En cuanto haya alguno, aparecerá aquí con su versión y
          compatibilidad.
        </EmptyState>
      ) : (
        <div
          className="kc-rise"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: 14,
          }}
        >
          {items.map((a) => (
            <article
              key={a.id}
              className="kc-panel kc-lift"
              style={{ padding: "16px 17px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--kc-com-soft)",
                    color: "var(--kc-com-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  SW
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--kc-ink)",
                      margin: 0,
                      letterSpacing: "-.016em",
                      lineHeight: 1.3,
                    }}
                  >
                    {a.title}
                  </h2>
                  <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: "3px 0 0" }}>
                    {[a.category, a.version].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              {a.description && (
                <p
                  className="kc-clamp-3"
                  style={{
                    fontSize: 12,
                    color: "var(--kc-ink-2)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {a.description}
                </p>
              )}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {a.compat && (
                  <Pill soft="var(--kc-tool-soft)" ink="var(--kc-tool-ink)" size="sm">
                    {a.compat}
                  </Pill>
                )}
                <Pill soft="#EDF2F7" ink="var(--kc-ink-3)" size="sm">
                  {tamano(a.sizeBytes)}
                </Pill>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: "auto",
                  paddingTop: 4,
                }}
              >
                <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)", flex: 1 }}>
                  {haceCuanto(a.updatedAt)}
                </span>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="kc-btn"
                    style={{
                      border: "1px solid var(--kc-line)",
                      background: "#fff",
                      color: "var(--kc-ink)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "7px 12px",
                      borderRadius: 9,
                      textDecoration: "none",
                    }}
                  >
                    Abrir
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
