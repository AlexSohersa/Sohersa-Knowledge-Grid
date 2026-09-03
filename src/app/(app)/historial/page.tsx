import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarHistorialWired } from "@/modules/personal/infrastructure/wiring";
import { rutaDe } from "@/modules/personal/domain/guardado";
import { estiloKind } from "@/modules/shared/domain/conocimiento";
import { horaCorta } from "@/modules/shared/domain/formato";
import { PageHead, EmptyState } from "@/components/ui/PageHead";
import { BotonLimpiarHistorial } from "@/components/personal/BotonLimpiarHistorial";

export const revalidate = 0;

/**
 * Lo último que abrió esta persona, agrupado por día.
 *
 * Responde a "¿dónde estaba eso que vi ayer?", que es de las formas más comunes
 * de volver a un documento: la gente recuerda cuándo lo vio mucho mejor que en
 * qué sección estaba.
 */
export default async function HistorialPage() {
  const yo = await exigirSesion();

  /*
   * El motivo queda en el registro del servidor.
   *
   * Un fallo aquí llegaba como «Application error» con un `digest` y nada más,
   * que no dice qué pasó ni a quién lo ve ni a quien lo tiene que arreglar.
   */
  let grupos: Awaited<ReturnType<typeof listarHistorialWired>>["grupos"] = [];
  let total = 0;

  try {
    const r = await listarHistorialWired(yo.email);
    grupos = r.grupos;
    total = r.total;
  } catch (e) {
    console.error(`[historial] ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="hist"
        title="Historial"
        description="Lo último que abriste, por día"
        accent="var(--kc-teal)"
        action={total > 0 ? <BotonLimpiarHistorial /> : null}
      />

      {total === 0 ? (
        <EmptyState title="Tu historial está vacío">
          Aquí va quedando lo que abres —documentos, capacitaciones, herramientas y
          preguntas— para que puedas volver sin buscarlo otra vez.
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {grupos.map((g) => (
            <section key={g.etiqueta} className="kc-rise">
              <h2
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: ".12em",
                  color: "#A9B7C6",
                  margin: "0 0 9px",
                }}
              >
                {g.etiqueta.toUpperCase()}
              </h2>

              <div className="kc-panel" style={{ overflow: "hidden" }}>
                {g.items.map((v, i) => {
                  const estilo = estiloKind(v.kind);
                  return (
                    <Link
                      key={v.id}
                      href={rutaDe(v.kind, v.targetId)}
                      className="kc-row-h"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                        textDecoration: "none",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          background: estilo.soft,
                          color: estilo.ink,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {estilo.ext}
                      </span>

                      <span
                        className="kc-clamp-1"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: "var(--kc-ink)",
                        }}
                      >
                        {v.title}
                      </span>

                      <span
                        style={{ fontSize: 10.5, color: "var(--kc-ink-4)", flexShrink: 0 }}
                      >
                        {horaCorta(v.viewedAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
