import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarGuardadosWired } from "@/modules/personal/infrastructure/wiring";
import { rutaDe } from "@/modules/personal/domain/guardado";
import { KINDS, estiloKind, type KindId } from "@/modules/shared/domain/conocimiento";
import { haceCuanto } from "@/modules/shared/domain/formato";
import { PageHead, EmptyState } from "@/components/ui/PageHead";

export const revalidate = 0;

/**
 * Lo que esta persona guardó para volver.
 *
 * Todos los tipos se muestran mezclados y ordenados por fecha: la lista de
 * guardados es "lo que quiero tener a mano", y separarla por tipo obligaría a
 * recordar en qué sección estaba lo que se guardó.
 */
export default async function GuardadosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const yo = await exigirSesion();

  const kind = tipo && tipo in KINDS ? (tipo as KindId) : undefined;
  const { items, porTipo, total } = await listarGuardadosWired(yo.email, kind);

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="star"
        title="Guardados"
        description="Lo que marcaste para volver después"
        accent="var(--kc-amber)"
      />

      {total === 0 ? (
        <EmptyState title="Todavía no has guardado nada">
          El marcador aparece en cada documento, capacitación, herramienta y pregunta.
          Lo que guardes queda aquí, ordenado por lo más reciente.
        </EmptyState>
      ) : (
        <>
          <nav
            aria-label="Filtrar guardados"
            className="kc-rise"
            style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}
          >
            <Pestana valor={undefined} actual={tipo}>
              Todo ({total})
            </Pestana>
            {(Object.keys(porTipo) as KindId[]).map((k) => (
              <Pestana key={k} valor={k} actual={tipo}>
                {KINDS[k].label} ({porTipo[k]})
              </Pestana>
            ))}
          </nav>

          <div className="kc-panel kc-rise" style={{ overflow: "hidden" }}>
            {items.map((g, i) => {
              const estilo = estiloKind(g.kind);
              return (
                <Link
                  key={g.id}
                  href={rutaDe(g.kind, g.targetId)}
                  className="kc-row-h"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "13px 17px",
                    borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                    textDecoration: "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: estilo.soft,
                      color: estilo.ink,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8.5,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {estilo.ext}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--kc-ink)",
                      }}
                    >
                      {g.title}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--kc-ink-3)" }}>
                      {estilo.label} · guardado {haceCuanto(g.createdAt)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Pestana({
  valor,
  actual,
  children,
}: {
  valor?: string;
  actual?: string;
  children: React.ReactNode;
}) {
  const activa = actual === valor;
  return (
    <Link
      href={valor ? `/guardados?tipo=${valor}` : "/guardados"}
      className="kc-btn"
      style={{
        border: `1px solid ${activa ? "rgba(245,184,67,.5)" : "var(--kc-line)"}`,
        background: activa ? "var(--kc-faq-soft)" : "#fff",
        color: activa ? "var(--kc-faq-ink)" : "var(--kc-ink-2)",
        fontSize: 11.5,
        fontWeight: 600,
        padding: "7px 12px",
        borderRadius: 9,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
