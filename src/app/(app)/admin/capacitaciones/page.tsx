import Link from "next/link";
import { listarCapacitacionesWired } from "@/modules/capacitaciones/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { Pill } from "@/components/ui/Pill";
import { PageHead } from "@/components/ui/PageHead";
import { FormularioCapacitacion } from "@/components/admin/FormularioCapacitacion";

export const revalidate = 0;

/** Estados de una capacitación y cómo se pintan. */
const ESTADOS: Record<string, { soft: string; ink: string; label: string }> = {
  BORRADOR: { soft: "#FDF3DC", ink: "#B07C10", label: "Borrador" },
  PUBLICADA: { soft: "#E4F8EB", ink: "#178A49", label: "Publicada" },
  ARCHIVADA: { soft: "#EDF2F7", ink: "#718198", label: "Archivada" },
};

/** Administrar capacitaciones: crearlas y ver en qué estado está cada una. */
export default async function AdminCapacitacionesPage() {
  const { items } = await listarCapacitacionesWired({ incluirBorradores: true });

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
        icon="cap"
        title="Capacitaciones"
        description="Crea el curso, agrega sus temas y publícalo cuando esté listo"
        accent="var(--kc-green)"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ── Listado ─────────────────────────────────────────────────── */}
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
              Todavía no hay ninguna. Crea la primera con el formulario de al lado.
            </p>
          ) : (
            items.map((cap, i) => {
              const total = cap.temas.length;
              const estado = ESTADOS[cap.status] ?? ESTADOS.BORRADOR;
              return (
                <Link
                  key={cap.id}
                  href={`/admin/capacitaciones/${cap.id}`}
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
                  <span
                    aria-hidden="true"
                    style={{
                      width: 4,
                      height: 32,
                      borderRadius: 4,
                      background: cap.accent,
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
                      {cap.title}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--kc-ink-3)" }}>
                      {[
                        cap.category,
                        cap.instructor,
                        `${total} ${total === 1 ? "tema" : "temas"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <Pill soft={estado.soft} ink={estado.ink} size="sm">
                    {estado.label}
                  </Pill>
                </Link>
              );
            })
          )}
        </div>

        {/* ── Crear ───────────────────────────────────────────────────── */}
        <FormularioCapacitacion />
      </div>
    </div>
  );
}
