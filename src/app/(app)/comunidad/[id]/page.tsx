import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import {
  registrarVistaPreguntaWired,
  verPreguntaWired,
} from "@/modules/comunidad/infrastructure/wiring";
import { registrarVisitaWired, estaGuardadoWired } from "@/modules/personal/infrastructure/wiring";
import {
  estadoPregunta,
  estiloEstado,
  etiquetaEstado,
} from "@/modules/comunidad/domain/pregunta";
import { colorAvatar, iniciales } from "@/modules/shared/domain/conocimiento";
import { haceCuanto } from "@/modules/shared/domain/formato";
import { Icon } from "@/components/layout/icons";
import { Pill } from "@/components/ui/Pill";
import { BotonGuardar } from "@/components/ui/BotonGuardar";
import { HiloRespuestas } from "@/components/comunidad/HiloRespuestas";
import { FormularioRespuesta } from "@/components/comunidad/FormularioRespuesta";
import { BotonPromoverFaq } from "@/components/comunidad/BotonPromoverFaq";

export const revalidate = 0;

/** Una pregunta con todo su hilo. */
export default async function PreguntaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const yo = await exigirSesion();

  const pregunta = await verPreguntaWired(yo.email, id);
  if (!pregunta) notFound();

  await Promise.all([
    registrarVistaPreguntaWired(pregunta.id),
    registrarVisitaWired(yo.email, "com", pregunta.id, pregunta.title),
  ]);

  const guardado = await estaGuardadoWired(yo.email, "com", pregunta.id);
  const estado = estadoPregunta(pregunta);
  const estilo = estiloEstado(estado);
  const tieneSolucion = pregunta.respuestas.some((r) => r.validatedAt !== null);

  return (
    <div style={{ padding: "24px 32px 44px", maxWidth: 900 }}>
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

      {/* ── La pregunta ─────────────────────────────────────────────────── */}
      <article className="kc-panel kc-rise" style={{ padding: "20px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-.026em",
                color: "var(--kc-ink)",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {pregunta.title}
            </h1>

            <div
              style={{
                display: "flex",
                gap: 7,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 11,
              }}
            >
              <Pill soft={estilo.soft} ink={estilo.ink}>
                {etiquetaEstado(estado)}
              </Pill>
              {pregunta.category && (
                <Pill soft="var(--kc-com-soft)" ink="var(--kc-com-ink)">
                  {pregunta.category}
                </Pill>
              )}
              {pregunta.software && pregunta.software !== "—" && (
                <Pill soft="var(--kc-tool-soft)" ink="var(--kc-tool-ink)">
                  {pregunta.software}
                </Pill>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <BotonGuardar
              kind="com"
              targetId={pregunta.id}
              title={pregunta.title}
              guardadoInicial={guardado}
            />
            {/* Promover a FAQ solo tiene sentido cuando ya hay una solución, y
                solo lo puede hacer administración. */}
            {yo.isAdmin && tieneSolucion && <BotonPromoverFaq preguntaId={pregunta.id} />}
          </div>
        </div>

        <p
          style={{
            fontSize: 13.5,
            color: "var(--kc-ink-2)",
            margin: "16px 0 0",
            lineHeight: 1.68,
            whiteSpace: "pre-wrap",
          }}
        >
          {pregunta.body}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid #EDF2F7",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: colorAvatar(pregunta.authorName),
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {iniciales(pregunta.authorName)}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--kc-ink)",
              }}
            >
              {pregunta.authorName}
            </span>
            <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
              {[pregunta.authorRole, `preguntó ${haceCuanto(pregunta.createdAt)}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
            {pregunta.views} {pregunta.views === 1 ? "vista" : "vistas"}
          </span>
        </div>
      </article>

      {/* ── Respuestas ──────────────────────────────────────────────────── */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--kc-ink)",
          margin: "0 0 12px",
          letterSpacing: "-.016em",
        }}
      >
        {pregunta.respuestas.length === 0
          ? "Todavía nadie ha respondido"
          : `${pregunta.respuestas.length} ${pregunta.respuestas.length === 1 ? "respuesta" : "respuestas"}`}
      </h2>

      {pregunta.respuestas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <HiloRespuestas pregunta={pregunta} yo={yo.email} esAdmin={yo.isAdmin} />
        </div>
      )}

      <FormularioRespuesta preguntaId={pregunta.id} />
    </div>
  );
}
