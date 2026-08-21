import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarPreguntasWired } from "@/modules/comunidad/infrastructure/wiring";
import { listarHerramientasWired } from "@/modules/herramientas/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { FormularioPregunta } from "@/components/comunidad/FormularioPregunta";

export const revalidate = 0;

/** Las categorías por defecto, cuando la comunidad todavía está vacía. */
const CATEGORIAS_BASE = ["Revit", "ACC", "Dynamo", "Navisworks", "Calidad", "Procesos"];

/**
 * Hacer una pregunta.
 *
 * Las categorías salen de lo que ya se ha preguntado, más una base fija para el
 * primer día: derivarlas del uso evita mantener una lista a mano que siempre se
 * queda corta.
 */
export default async function PreguntarPage() {
  const yo = await exigirSesion();

  const [{ categorias }, { items: herramientas }] = await Promise.all([
    listarPreguntasWired(yo.email),
    listarHerramientasWired(),
  ]);

  const todasCategorias = [...new Set([...CATEGORIAS_BASE, ...categorias])].sort((a, b) =>
    a.localeCompare(b, "es"),
  );

  const softwares = [...new Set(herramientas.map(({ herramienta }) => herramienta.name))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );

  return (
    <div style={{ padding: "24px 32px 44px", maxWidth: 760 }}>
      <Link
        href="/comunidad"
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
        Comunidad
      </Link>

      <div className="kc-rise" style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.03em",
            color: "var(--kc-ink)",
            margin: 0,
          }}
        >
          Hacer una pregunta
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--kc-ink-3)",
            margin: "6px 0 0",
            lineHeight: 1.55,
            maxWidth: 560,
          }}
        >
          Cuanto más concreta sea, mejor te van a poder ayudar. Di qué intentaste, qué
          esperabas que pasara y qué pasó en realidad.
        </p>
      </div>

      <FormularioPregunta categorias={todasCategorias} softwares={softwares} />
    </div>
  );
}
