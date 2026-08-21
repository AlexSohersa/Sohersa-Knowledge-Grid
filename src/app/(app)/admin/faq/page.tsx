import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarFaqWired } from "@/modules/faq/infrastructure/wiring";
import { necesitaRevision, utilidad } from "@/modules/faq/domain/faq";
import { Icon } from "@/components/layout/icons";
import { Pill } from "@/components/ui/Pill";
import { PageHead } from "@/components/ui/PageHead";
import { FormularioFaq } from "@/components/admin/FormularioFaq";
import { BorrarFaq } from "@/components/admin/BorrarFaq";

export const revalidate = 0;

/** Administrar preguntas frecuentes. */
export default async function AdminFaqPage() {
  const yo = await exigirSesion();
  const { categorias, total } = await listarFaqWired(yo.email, { incluirBorradores: true });

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <Link
        href="/admin"
        className="kc-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink-2)",
          fontSize: 11.5,
          fontWeight: 600,
          padding: "7px 11px",
          borderRadius: 9,
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <Icon name="back" size={12} />
        Administración
      </Link>

      <PageHead
        icon="faq"
        title="Preguntas frecuentes"
        description="La respuesta oficial de la empresa a lo que más se pregunta"
        accent="var(--kc-amber)"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {total === 0 ? (
            <p
              className="kc-panel"
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 12.5,
                color: "var(--kc-ink-3)",
                margin: 0,
              }}
            >
              Todavía no hay preguntas frecuentes. Crea la primera con el formulario de
              al lado.
            </p>
          ) : (
            categorias.map((c) => (
              <section key={c.name} className="kc-panel kc-rise" style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #EDF2F7" }}>
                  <h2
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--kc-ink)",
                      margin: 0,
                    }}
                  >
                    {c.name}{" "}
                    <span style={{ fontWeight: 400, color: "var(--kc-ink-4)" }}>
                      · {c.items.length}
                    </span>
                  </h2>
                </div>

                {c.items.map((f, i) => {
                  const pct = utilidad(f);
                  const revisar = necesitaRevision(f);

                  return (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 11,
                        padding: "12px 16px",
                        borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "var(--kc-ink)",
                            lineHeight: 1.4,
                          }}
                        >
                          {f.question}
                        </span>
                        <span
                          className="kc-clamp-2"
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "var(--kc-ink-3)",
                            marginTop: 3,
                            lineHeight: 1.5,
                          }}
                        >
                          {f.answer}
                        </span>

                        <span
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 7,
                            alignItems: "center",
                          }}
                        >
                          {f.fromQuestionId && (
                            <Pill soft="var(--kc-com-soft)" ink="var(--kc-com-ink)" size="sm">
                              Vino de la comunidad
                            </Pill>
                          )}
                          {pct !== null && (
                            <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
                              {pct}% útil ({f.helpful + f.notHelpful} votos)
                            </span>
                          )}
                          {revisar && (
                            <Pill soft="#FCE9EA" ink="#C23840" size="sm">
                              Conviene revisarla
                            </Pill>
                          )}
                        </span>
                      </span>

                      <BorrarFaq faqId={f.id} />
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </div>

        <FormularioFaq />
      </div>
    </div>
  );
}
