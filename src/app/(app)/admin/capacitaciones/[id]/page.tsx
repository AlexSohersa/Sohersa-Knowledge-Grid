import { notFound } from "next/navigation";
import Link from "next/link";
import { verCapacitacionWired } from "@/modules/capacitaciones/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { Pill } from "@/components/ui/Pill";
import { EditorTemas } from "@/components/admin/EditorTemas";
import { AccionesCapacitacion } from "@/components/admin/AccionesCapacitacion";

export const revalidate = 0;

const ESTADOS: Record<string, { soft: string; ink: string; label: string }> = {
  BORRADOR: { soft: "#FDF3DC", ink: "#B07C10", label: "Borrador" },
  PUBLICADA: { soft: "#E4F8EB", ink: "#178A49", label: "Publicada" },
  ARCHIVADA: { soft: "#EDF2F7", ink: "#718198", label: "Archivada" },
};

/**
 * El editor de una capacitación: sus temas y el material de cada uno.
 *
 * Publicar está aquí y no en el listado porque solo tiene sentido cuando ya se
 * ve el temario: publicar a ciegas es lo que produce cursos vacíos.
 */
export default async function AdminCapacitacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cap = await verCapacitacionWired(id);
  if (!cap) notFound();

  const total = cap.temas.length;
  const estado = ESTADOS[cap.status] ?? ESTADOS.BORRADOR;

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <Link
        href="/admin/capacitaciones"
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
        Capacitaciones
      </Link>

      <div
        className="kc-panel kc-rise"
        style={{ padding: "18px 20px", marginBottom: 18, borderTop: `4px solid ${cap.accent}` }}
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
              <Pill soft={estado.soft} ink={estado.ink} size="sm">
                {estado.label}
              </Pill>
              <span style={{ fontSize: 11, color: "var(--kc-ink-4)" }}>
                {total} {total === 1 ? "tema" : "temas"}
              </span>
            </div>

            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-.026em",
                color: "var(--kc-ink)",
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              {cap.title}
            </h1>
            {cap.summary && (
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--kc-ink-3)",
                  margin: "6px 0 0",
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                {cap.summary}
              </p>
            )}
          </div>

          <AccionesCapacitacion
            capId={cap.id}
            estado={cap.status}
            tieneTemas={cap.temas.length > 0}
          />
        </div>
      </div>

      <EditorTemas cap={cap} />
    </div>
  );
}
