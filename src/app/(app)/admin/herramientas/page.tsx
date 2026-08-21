import Link from "next/link";
import { listarHerramientasWired } from "@/modules/herramientas/infrastructure/wiring";
import { estiloAdopcion, etiquetaAdopcion } from "@/modules/herramientas/domain/herramienta";
import { Icon } from "@/components/layout/icons";
import { Pill } from "@/components/ui/Pill";
import { PageHead } from "@/components/ui/PageHead";
import { FormularioHerramienta } from "@/components/admin/FormularioHerramienta";
import { DarDeBaja } from "@/components/admin/DarDeBaja";

export const revalidate = 0;

/** Administrar el catálogo de herramientas. */
export default async function AdminHerramientasPage() {
  const { items } = await listarHerramientasWired({ incluirInactivas: true });

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
        icon="tool"
        title="Herramientas"
        description="El software con su versión, licencia y estado de adopción"
        accent="var(--kc-blue)"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div className="kc-panel kc-rise" style={{ overflow: "hidden" }}>
          {items.length === 0 ? (
            <p
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 12.5,
                color: "var(--kc-ink-3)",
                margin: 0,
              }}
            >
              Todavía no hay herramientas. Registra la primera con el formulario de al
              lado.
            </p>
          ) : (
            items.map(({ herramienta: h }, i) => {
              const adopcion = estiloAdopcion(h.status);
              return (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 17px",
                    borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                    opacity: h.active ? 1 : 0.6,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 4,
                      height: 30,
                      borderRadius: 4,
                      background: h.accent,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--kc-ink)",
                      }}
                    >
                      {h.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--kc-ink-3)" }}>
                      {[h.kind, h.version, h.discipline].filter(Boolean).join(" · ")}
                    </span>
                  </span>

                  <Pill soft={adopcion.soft} ink={adopcion.ink} size="sm">
                    {etiquetaAdopcion(h.status)}
                  </Pill>

                  {h.active && <DarDeBaja herramientaId={h.id} />}
                </div>
              );
            })
          )}
        </div>

        <FormularioHerramienta />
      </div>
    </div>
  );
}
