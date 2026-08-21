import { notFound } from "next/navigation";
import Link from "next/link";
import {
  asignadosDeRutaWired,
  verRutaWired,
} from "@/modules/rutas/infrastructure/wiring";
import { listarCapacitacionesWired } from "@/modules/capacitaciones/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { EditorRuta } from "@/components/admin/EditorRuta";
import { AsignarRuta } from "@/components/admin/AsignarRuta";

export const revalidate = 0;

/**
 * El editor de una ruta: sus etapas, sus elementos y a quién está asignada.
 *
 * Estructura y asignación van juntas porque son la misma tarea: armar la ruta
 * sirve de poco si no se le da a nadie, y asignarla sin ver qué contiene es dar
 * un camino a ciegas.
 */
export default async function AdminRutaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ruta, asignados, caps] = await Promise.all([
    verRutaWired(id),
    asignadosDeRutaWired(id),
    listarCapacitacionesWired(),
  ]);

  if (!ruta) notFound();

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <Link
        href="/admin/rutas"
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
        Rutas
      </Link>

      <div className="kc-rise" style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-.03em",
            color: "var(--kc-ink)",
            margin: 0,
          }}
        >
          {ruta.name}
        </h1>
        {ruta.objective && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--kc-ink-3)",
              margin: "6px 0 0",
              lineHeight: 1.55,
              maxWidth: 620,
            }}
          >
            {ruta.objective}
          </p>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <EditorRuta
          ruta={ruta}
          capacitaciones={caps.items.map((cap) => ({
            id: cap.id,
            title: cap.title,
            duration: cap.duration,
          }))}
        />

        <AsignarRuta rutaId={ruta.id} asignados={asignados} />
      </div>
    </div>
  );
}
