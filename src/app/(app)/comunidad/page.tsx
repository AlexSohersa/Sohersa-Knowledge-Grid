import Link from "next/link";
import { exigirSeccion } from "@/lib/grid/session";
import { listarPreguntasWired } from "@/modules/comunidad/infrastructure/wiring";
import {
  estadoPregunta,
  estiloEstado,
  etiquetaEstado,
} from "@/modules/comunidad/domain/pregunta";
import { colorAvatar, iniciales } from "@/modules/shared/domain/conocimiento";
import { haceCuanto } from "@/modules/shared/domain/formato";
import { PageHead, EmptyState } from "@/components/ui/PageHead";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/layout/icons";

export const revalidate = 0;

/**
 * La comunidad: preguntas y respuestas del equipo.
 *
 * Es la conversación, no la doctrina. Lo que aquí se resuelve bien puede
 * promoverse a pregunta frecuente, y esa es la diferencia con la sección de
 * FAQ.
 */
export default async function ComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; categoria?: string }>;
}) {
  const yo = await exigirSeccion("comunidad");
  const { estado, categoria } = await searchParams;

  const { items, categorias, sinResponder, resueltas, total } = await listarPreguntasWired(
    yo.email,
    { estado, categoria },
  );

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="com"
        title="Comunidad"
        description="Pregunta, comparte y convierte experiencia en conocimiento."
        accent="var(--kc-violet)"
        action={
          <Link
            href="/comunidad/preguntar"
            className="kc-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "none",
              background: "var(--kc-green-solid)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "9px 15px",
              borderRadius: 10,
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "var(--kc-shadow-btn)",
            }}
          >
            <Icon name="plus" size={13} />
            Hacer una pregunta
          </Link>
        }
      />

      {/* Filtros por estado: son enlaces reales, así el filtro se comparte. */}
      {total > 0 && (
        <nav
          aria-label="Filtrar preguntas"
          className="kc-rise"
          style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}
        >
          <FiltroEstado actual={estado} valor={undefined} categoria={categoria}>
            Todas ({total})
          </FiltroEstado>
          <FiltroEstado actual={estado} valor="sin_responder" categoria={categoria}>
            Sin responder ({sinResponder})
          </FiltroEstado>
          <FiltroEstado actual={estado} valor="resuelta" categoria={categoria}>
            Resueltas ({resueltas})
          </FiltroEstado>

          {categorias.length > 1 && (
            <span
              style={{
                width: 1,
                background: "var(--kc-line)",
                margin: "0 4px",
                alignSelf: "stretch",
              }}
            />
          )}
          {categorias.length > 1 &&
            categorias.map((c) => (
              <Link
                key={c}
                href={`/comunidad?${new URLSearchParams({
                  ...(estado ? { estado } : {}),
                  ...(categoria === c ? {} : { categoria: c }),
                }).toString()}`}
                className="kc-btn"
                style={{
                  border: `1px solid ${categoria === c ? "rgba(139,124,246,.5)" : "var(--kc-line)"}`,
                  background: categoria === c ? "var(--kc-com-soft)" : "#fff",
                  color: categoria === c ? "var(--kc-com-ink)" : "var(--kc-ink-2)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "7px 12px",
                  borderRadius: 9,
                  textDecoration: "none",
                }}
              >
                {c}
              </Link>
            ))}
        </nav>
      )}

      {items.length === 0 ? (
        <EmptyState
          title={total === 0 ? "Todavía no hay preguntas" : "Ninguna pregunta con ese filtro"}
          action={
            <Link
              href="/comunidad/preguntar"
              className="kc-btn"
              style={{
                display: "inline-flex",
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                padding: "11px 18px",
                borderRadius: 11,
                textDecoration: "none",
                boxShadow: "var(--kc-shadow-btn)",
              }}
            >
              Hacer la primera pregunta
            </Link>
          }
        >
          Cuando alguien pregunta algo aquí, el equipo responde y administración marca
          la respuesta correcta como solución. Así deja de perderse en un chat.
        </EmptyState>
      ) : (
        <div className="kc-rise" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {items.map((p) => {
            const est = estadoPregunta(p);
            const estilo = estiloEstado(est);
            const validadas = p.respuestas.filter((r) => r.validatedAt !== null).length;

            return (
              <Link
                key={p.id}
                href={`/comunidad/${p.id}`}
                className="kc-panel kc-lift"
                style={{
                  padding: "15px 17px",
                  display: "flex",
                  gap: 13,
                  textDecoration: "none",
                  alignItems: "flex-start",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: colorAvatar(p.authorName),
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11.5,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {iniciales(p.authorName)}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--kc-ink)",
                      margin: 0,
                      letterSpacing: "-.016em",
                      lineHeight: 1.4,
                    }}
                  >
                    {p.title}
                  </h2>
                  <p
                    className="kc-clamp-2"
                    style={{
                      fontSize: 12,
                      color: "var(--kc-ink-3)",
                      margin: "5px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.body}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginTop: 9,
                    }}
                  >
                    <Pill soft={estilo.soft} ink={estilo.ink} size="sm">
                      {etiquetaEstado(est)}
                    </Pill>
                    {p.category && (
                      <Pill soft="var(--kc-com-soft)" ink="var(--kc-com-ink)" size="sm">
                        {p.category}
                      </Pill>
                    )}
                    <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
                      {p.authorName} · {haceCuanto(p.createdAt)}
                    </span>
                  </div>
                </div>

                {/* El número de respuestas es lo primero que se mira al elegir
                    qué pregunta abrir: va en su propia columna, alineado. */}
                <div style={{ textAlign: "center", flexShrink: 0, minWidth: 52 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 19,
                      fontWeight: 700,
                      color: validadas > 0 ? "var(--kc-green-ink)" : "var(--kc-ink-2)",
                      lineHeight: 1.1,
                    }}
                  >
                    {p.respuestas.length}
                  </span>
                  <span style={{ fontSize: 9.5, color: "var(--kc-ink-4)" }}>
                    {p.respuestas.length === 1 ? "respuesta" : "respuestas"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FiltroEstado({
  actual,
  valor,
  categoria,
  children,
}: {
  actual?: string;
  valor?: string;
  categoria?: string;
  children: React.ReactNode;
}) {
  const activo = actual === valor;
  const params = new URLSearchParams({
    ...(valor ? { estado: valor } : {}),
    ...(categoria ? { categoria } : {}),
  });

  return (
    <Link
      href={`/comunidad${params.toString() ? `?${params}` : ""}`}
      className="kc-btn"
      style={{
        border: `1px solid ${activo ? "rgba(50,214,107,.5)" : "var(--kc-line)"}`,
        background: activo ? "var(--kc-cap-soft)" : "#fff",
        color: activo ? "var(--kc-cap-ink)" : "var(--kc-ink-2)",
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
