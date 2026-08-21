import { notFound } from "next/navigation";
import { exigirSesion } from "@/lib/grid/session";
import { verHerramientaWired } from "@/modules/herramientas/infrastructure/wiring";
import {
  esApta,
  estiloAdopcion,
  estiloClase,
  etiquetaAdopcion,
  explicacionAdopcion,
} from "@/modules/herramientas/domain/herramienta";
import { estaGuardadoWired, registrarVisitaWired } from "@/modules/personal/infrastructure/wiring";
import { BotonVolver } from "@/components/ui/BotonVolver";
import { Pill } from "@/components/ui/Pill";
import { BotonGuardar } from "@/components/ui/BotonGuardar";

export const revalidate = 0;

/** La ficha de una herramienta. */
export default async function HerramientaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string; ref?: string }>;
}) {
  const { id } = await params;
  const { de, ref } = await searchParams;
  const yo = await exigirSesion();

  const h = await verHerramientaWired(id);
  if (!h) notFound();

  await registrarVisitaWired(yo.email, "tool", h.id, h.name);
  const guardado = await estaGuardadoWired(yo.email, "tool", h.id);

  const adopcion = estiloAdopcion(h.status);
  const clase = estiloClase(h.kind);

  return (
    <div style={{ padding: "24px 32px 44px", maxWidth: 860 }}>
      {/* A dónde vuelve depende de por dónde se entró: desde una ruta,
          de vuelta a la ruta y a su etapa. */}
      <BotonVolver de={de} detalle={ref} porOmision={{ href: "/herramientas", etiqueta: "Herramientas" }} />

      <div
        className="kc-panel kc-rise"
        style={{ padding: "22px 24px", borderTop: `4px solid ${h.accent}` }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1
              style={{
                fontSize: 23,
                fontWeight: 700,
                letterSpacing: "-.03em",
                color: "var(--kc-ink)",
                margin: 0,
              }}
            >
              {h.name}
            </h1>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <Pill soft={clase.soft} ink={clase.ink}>
                {h.kind}
              </Pill>
              <Pill soft={adopcion.soft} ink={adopcion.ink}>
                {etiquetaAdopcion(h.status)}
              </Pill>
            </div>
          </div>

          <BotonGuardar kind="tool" targetId={h.id} title={h.name} guardadoInicial={guardado} />
        </div>

        {h.description && (
          <p
            style={{
              fontSize: 13.5,
              color: "var(--kc-ink-2)",
              margin: "16px 0 0",
              lineHeight: 1.6,
            }}
          >
            {h.description}
          </p>
        )}

        {/*
         * Qué significa el estado, en una línea. La etiqueta sola no basta: "en
         * piloto" puede entenderse de varias formas, y quien mira esta ficha
         * necesita saber exactamente si puede apoyar un entregable en esto.
         */}
        <p
          style={{
            margin: "16px 0 0",
            padding: "11px 14px",
            background: adopcion.soft,
            borderRadius: 11,
            fontSize: 12.5,
            color: adopcion.ink,
            lineHeight: 1.55,
            fontWeight: 500,
          }}
        >
          {explicacionAdopcion(h.status)}
          {esApta(h) ? "" : " Consulta con Transformación Digital antes de usarla en un entregable."}
        </p>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 16,
            margin: "22px 0 0",
            paddingTop: 18,
            borderTop: "1px solid #EDF2F7",
          }}
        >
          <Dato etiqueta="Versión vigente" valor={h.version} />
          <Dato etiqueta="Licenciamiento" valor={h.license} />
          <Dato etiqueta="Disciplinas" valor={h.discipline} />
        </dl>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: ".12em",
          color: "#A9B7C6",
          margin: 0,
        }}
      >
        {etiqueta.toUpperCase()}
      </dt>
      <dd
        style={{
          fontSize: 13,
          color: "var(--kc-ink)",
          margin: "5px 0 0",
          fontWeight: 500,
        }}
      >
        {valor ?? "—"}
      </dd>
    </div>
  );
}
