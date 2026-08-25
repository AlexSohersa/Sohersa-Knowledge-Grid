import Link from "next/link";
import { areasDelPadron, exigirSesion } from "@/lib/grid/session";
import { listarFaqWired } from "@/modules/faq/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { FormularioPropuesta } from "@/components/faq/FormularioPropuesta";

export const revalidate = 0;

/** Los softwares que el área reconoce, según su catálogo. */
const PLATAFORMAS = [
  "Revit",
  "Autodesk Forma",
  "Navisworks",
  "AutoCAD",
  "Desktop Connector",
  "Otro",
];

/**
 * Agregar FAQ: cualquiera propone, Estandarización y Calidad revisa.
 *
 * Vive dentro de `/faq` y no en una sección aparte: es parte del mismo trabajo
 * —buscar una respuesta y, si no está, pedirla—, y sacarlo del FAQ obligaría a
 * recordar dónde estaba.
 */
export default async function ProponerPage() {
  const yo = await exigirSesion();

  /*
   * Las plataformas que ya existen en el catálogo van primero, y luego las del
   * catálogo del área que todavía no tienen ninguna ficha. Así la lista refleja
   * lo que de verdad se usa sin cerrar la puerta a lo demás.
   */
  const [{ categorias }, areas] = await Promise.all([
    listarFaqWired(yo.email),
    areasDelPadron(),
  ]);

  const fichas = categorias.flatMap((c) => c.items);
  const usadas = [...new Set(fichas.map((f) => f.platform).filter(Boolean))] as string[];

  const plataformas = [...usadas, ...PLATAFORMAS.filter((p) => !usadas.includes(p))];

  /* Los temas que ya existen, para archivar la captura donde toca. */
  const subcategorias = categorias.map((c) => c.name);

  return (
    <div style={{ padding: "24px 32px 44px", maxWidth: 820 }}>
      <Link
        href="/faq"
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
          marginBottom: 18,
        }}
      >
        <Icon name="back" size={12} />
        Preguntas frecuentes
      </Link>

      <h1
        style={{
          fontSize: 21,
          fontWeight: 700,
          letterSpacing: "-.028em",
          color: "var(--kc-ink)",
          margin: "0 0 7px",
        }}
      >
        Agregar una ficha
      </h1>
      <p style={{ fontSize: 13, color: "var(--kc-ink-3)", margin: "0 0 22px", lineHeight: 1.6, maxWidth: 560 }}>
        Si te topaste con un problema que no está en la base, cuéntalo aquí. No hace
        falta que sepas la solución: media ficha es más útil que ninguna.
      </p>

      <FormularioPropuesta
        plataformas={plataformas}
        subcategorias={subcategorias}
        areas={areas}
        autor={{ nombre: yo.name, area: yo.area }}
      />
    </div>
  );
}
