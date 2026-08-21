import Link from "next/link";
import { listarRutasWired } from "@/modules/rutas/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { PageHead } from "@/components/ui/PageHead";
import { FormularioRuta } from "@/components/admin/FormularioRuta";

export const revalidate = 0;

/** Administrar rutas de aprendizaje. */
export default async function AdminRutasPage() {
  const rutas = await listarRutasWired();

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
        icon="path"
        title="Rutas de aprendizaje"
        description="El camino por etapas que se asigna a cada persona"
        accent="var(--kc-teal)"
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
          {rutas.length === 0 ? (
            <p
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 12.5,
                color: "var(--kc-ink-3)",
                margin: 0,
              }}
            >
              Todavía no hay rutas. Crea la primera con el formulario de al lado.
            </p>
          ) : (
            rutas.map((r, i) => {
              const totalItems = r.etapas.reduce((n, e) => n + e.items.length, 0);
              return (
                <Link
                  key={r.id}
                  href={`/admin/rutas/${r.id}`}
                  className="kc-row-h"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 17px",
                    borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--kc-ink)",
                      }}
                    >
                      {r.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--kc-ink-3)" }}>
                      {r.etapas.length} {r.etapas.length === 1 ? "etapa" : "etapas"} ·{" "}
                      {totalItems} {totalItems === 1 ? "elemento" : "elementos"}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </div>

        <FormularioRuta />
      </div>
    </div>
  );
}
