import { notFound } from "next/navigation";
import { exigirSeccion } from "@/lib/grid/session";
import {
  registrarVistaWired,
  verCapacitacionWired,
} from "@/modules/capacitaciones/infrastructure/wiring";
import { estaGuardadoWired, registrarVisitaWired } from "@/modules/personal/infrastructure/wiring";
import { estiloNivel } from "@/modules/capacitaciones/domain/capacitacion";
import { BotonVolver } from "@/components/ui/BotonVolver";
import { Pill } from "@/components/ui/Pill";
import { BotonGuardar } from "@/components/ui/BotonGuardar";
import { ExploradorMaterial } from "@/components/capacitaciones/ExploradorMaterial";

export const revalidate = 0;

/**
 * La ficha de una capacitación: su material, para consultarlo.
 *
 * Sin avance ni "marcar visto": esto es una fuente de información. Quien
 * necesita seguimiento lo tiene en su ruta, donde la misma capacitación sí
 * lleva cuenta de lo hecho.
 */
export default async function CapacitacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string; ref?: string }>;
}) {
  const { id } = await params;
  const { de, ref } = await searchParams;
  const yo = await exigirSeccion("capacitaciones");

  const cap = await verCapacitacionWired(id);
  if (!cap) notFound();

  // Las dos son secundarias respecto a mostrar el material, pero hay que
  // esperarlas: en un Server Component una promesa suelta se cancela al
  // terminar la respuesta.
  await Promise.all([
    registrarVistaWired(cap.id),
    registrarVisitaWired(yo.email, "cap", cap.id, cap.title),
  ]);

  const guardado = await estaGuardadoWired(yo.email, "cap", cap.id);
  const nivel = estiloNivel(cap.level);
  const videos = cap.temas.filter((t) => t.videoUrl).length;
  const materiales = cap.temas.reduce((n, t) => n + t.materials.length, 0);

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      {/* A dónde vuelve depende de por dónde se entró: desde una ruta,
          de vuelta a la ruta y a su etapa. */}
      <BotonVolver de={de} detalle={ref} porOmision={{ href: "/capacitaciones", etiqueta: "Capacitaciones" }} />

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div
        className="kc-panel kc-rise"
        style={{ padding: "20px 22px", marginBottom: 18, borderTop: `4px solid ${cap.accent}` }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1
              style={{
                fontSize: 23,
                fontWeight: 700,
                letterSpacing: "-.03em",
                color: "var(--kc-ink)",
                margin: 0,
                lineHeight: 1.22,
              }}
            >
              {cap.title}
            </h1>

            {cap.summary && (
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--kc-ink-2)",
                  margin: "9px 0 0",
                  lineHeight: 1.6,
                  maxWidth: 640,
                }}
              >
                {cap.summary}
              </p>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              <Pill soft={nivel.soft} ink={nivel.ink}>
                {cap.level}
              </Pill>
              {cap.category && (
                <Pill soft="var(--kc-tool-soft)" ink="var(--kc-tool-ink)">
                  {cap.category}
                </Pill>
              )}
              {cap.duration && (
                <Pill soft="#EDF2F7" ink="var(--kc-ink-3)">
                  {cap.duration}
                </Pill>
              )}
              <Pill soft="#EDF2F7" ink="var(--kc-ink-3)">
                {videos} {videos === 1 ? "video" : "videos"} · {materiales}{" "}
                {materiales === 1 ? "documento" : "documentos"}
              </Pill>
            </div>

            {cap.instructor && (
              <p style={{ fontSize: 12, color: "var(--kc-ink-3)", margin: "12px 0 0" }}>
                Imparte <strong style={{ color: "var(--kc-ink)" }}>{cap.instructor}</strong>
                {cap.instructorRole ? ` · ${cap.instructorRole}` : ""}
              </p>
            )}
          </div>

          <BotonGuardar
            kind="cap"
            targetId={cap.id}
            title={cap.title}
            guardadoInicial={guardado}
          />
        </div>

        {cap.objectives.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #EDF2F7" }}>
            <p
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: ".12em",
                color: "#A9B7C6",
                margin: "0 0 10px",
              }}
            >
              QUÉ CUBRE
            </p>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: 9,
              }}
            >
              {cap.objectives.map((o) => (
                <li
                  key={o}
                  style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--kc-ink-2)" }}
                >
                  <span
                    aria-hidden="true"
                    style={{ color: "var(--kc-green-ink)", flexShrink: 0, marginTop: 2 }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <span style={{ lineHeight: 1.5 }}>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ExploradorMaterial cap={cap} />
    </div>
  );
}
