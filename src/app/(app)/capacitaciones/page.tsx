import { listarCapacitacionesWired } from "@/modules/capacitaciones/infrastructure/wiring";
import { EmptyState } from "@/components/ui/PageHead";
import { CapacitacionesGaleria } from "@/components/capacitaciones/CapacitacionesGaleria";

export const revalidate = 0;

/**
 * La biblioteca de capacitaciones.
 *
 * Es una FUENTE DE CONSULTA, no un curso que haya que completar: aquí está todo
 * lo que el equipo grabó y documentó, para buscarlo y verlo cuando haga falta.
 * Nadie lleva la cuenta de qué has visto.
 *
 * El aprendizaje con seguimiento —"esto te toca, en este orden"— vive en
 * "Mi ruta", que es otra cosa y se ve distinta a propósito.
 */
export default async function CapacitacionesPage() {
  const { items, facetas, totalTemas, totalMateriales } = await listarCapacitacionesWired();

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <div
        className="kc-rise"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-.03em",
              color: "var(--kc-ink)",
              margin: 0,
            }}
          >
            Capacitaciones
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--kc-ink-3)", margin: "5px 0 0" }}>
            Aprende de la experiencia y el conocimiento del equipo.
          </p>
        </div>

        {items.length > 0 && (
          <span style={{ fontSize: 11, color: "var(--kc-ink-4)", paddingTop: 6 }}>
            {items.length} {items.length === 1 ? "capacitación" : "capacitaciones"} ·{" "}
            {totalTemas} {totalTemas === 1 ? "tema" : "temas"} · {totalMateriales}{" "}
            {totalMateriales === 1 ? "material" : "materiales"}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Todavía no hay capacitaciones publicadas">
          Las capacitaciones se arman desde <strong>Administración</strong>: se crea la
          capacitación, se agregan sus temas con video y material de apoyo, y al
          publicarla aparece aquí para todo el equipo.
        </EmptyState>
      ) : (
        <CapacitacionesGaleria items={items} facetas={facetas} />
      )}
    </div>
  );
}
