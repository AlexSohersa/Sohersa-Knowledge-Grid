"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/layout/icons";
import { normalizar } from "@/modules/biblioteca/domain/documento";
import { utilidad, type CategoriaFaq, type Faq } from "@/modules/faq/domain/faq";
import { marcarOrigen } from "@/modules/shared/domain/procedencia";
import { votarFaq } from "@/app/(app)/faq/acciones";

/**
 * Las preguntas frecuentes, por categoría y en acordeón.
 *
 * Una sola pregunta abierta a la vez: la respuesta con sus pasos es larga, y
 * varias desplegadas obligarían a desplazarse mucho para comparar. El acordeón
 * mantiene la lista de preguntas siempre a la vista, que es como se hojea una
 * FAQ.
 */
export function FaqAcordeon({ categorias }: { categorias: CategoriaFaq[] }) {
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<string>(categorias[0]?.name ?? "");
  const [abierta, setAbierta] = useState<string | null>(
    categorias[0]?.items[0]?.id ?? null,
  );

  const buscando = q.trim().length > 0;

  /*
   * Al buscar se recorre TODA la FAQ, no solo la categoría abierta: quien
   * escribe "licencia" quiere la respuesta esté donde esté, y obligarle a
   * adivinar la categoría haría el buscador inútil.
   */
  const visibles = useMemo(() => {
    if (!buscando) {
      return categorias.find((c) => c.name === categoria)?.items ?? [];
    }
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);
    return categorias
      .flatMap((c) => c.items)
      .filter((f) => {
        const heno = normalizar([f.question, f.answer, f.category, ...f.steps].join(" "));
        return palabras.every((p) => heno.includes(p));
      });
  }, [buscando, q, categoria, categorias]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "232px minmax(0,1fr)",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* ── Categorías ──────────────────────────────────────────────────── */}
      <div className="kc-panel kc-rise kc-sticky" style={{ padding: "12px 10px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid var(--kc-line)",
            borderRadius: 10,
            padding: "0 10px",
            height: 34,
            marginBottom: 12,
            background: "#F8FAFC",
            cursor: "text",
          }}
        >
          <span style={{ color: "var(--kc-ink-4)", display: "flex" }}>
            <Icon name="search" size={13} />
          </span>
          <span className="kc-sr">Buscar en preguntas frecuentes</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar una duda…"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--kc-font)",
              fontSize: 11.5,
              color: "var(--kc-ink)",
            }}
          />
        </label>

        <nav
          aria-label="Categorías de preguntas frecuentes"
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {categorias.map((c) => {
            const activa = !buscando && c.name === categoria;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setCategoria(c.name);
                  setQ("");
                  setAbierta(c.items[0]?.id ?? null);
                }}
                aria-current={activa ? "true" : undefined}
                className="kc-row-h"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: "none",
                  background: activa ? "var(--kc-faq-soft)" : "transparent",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  fontFamily: "var(--kc-font)",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12,
                    fontWeight: activa ? 600 : 400,
                    color: activa ? "var(--kc-faq-ink)" : "var(--kc-ink-2)",
                  }}
                >
                  {c.name}
                </span>
                <span style={{ fontSize: 9.5, color: "var(--kc-ink-4)" }}>{c.items.length}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Preguntas ───────────────────────────────────────────────────── */}
      <div className="kc-rise" style={{ animationDelay: ".05s" }}>
        <div className="kc-panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #EDF2F7" }}>
            <h2
              style={{
                fontSize: 15.5,
                fontWeight: 700,
                color: "var(--kc-ink)",
                margin: 0,
                letterSpacing: "-.022em",
              }}
            >
              {buscando ? `Resultados para “${q}”` : categoria}
            </h2>
            <p style={{ fontSize: 11.5, color: "var(--kc-ink-3)", margin: "3px 0 0" }}>
              {visibles.length} {visibles.length === 1 ? "pregunta" : "preguntas"}
            </p>
          </div>

          {visibles.length === 0 ? (
            <p
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 12.5,
                color: "var(--kc-ink-3)",
                margin: 0,
              }}
            >
              Ninguna pregunta frecuente coincide.{" "}
              <Link href="/comunidad/preguntar" style={{ fontWeight: 600 }}>
                Pregúntalo a la comunidad
              </Link>
              .
            </p>
          ) : (
            visibles.map((f) => (
              <ItemFaq
                key={f.id}
                faq={f}
                abierta={abierta === f.id}
                onAbrir={() => setAbierta(abierta === f.id ? null : f.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ItemFaq({
  faq,
  abierta,
  onAbrir,
}: {
  faq: Faq;
  abierta: boolean;
  onAbrir: () => void;
}) {
  const [voto, setVoto] = useState<boolean | null>(faq.miVoto);
  const [contadores, setContadores] = useState({
    helpful: faq.helpful,
    notHelpful: faq.notHelpful,
  });
  const [pendiente, iniciar] = useTransition();

  const pct = utilidad(contadores);

  function votar(util: boolean) {
    if (voto === util) return; // Votar lo mismo dos veces no cambia nada.
    const previo = { voto, contadores };
    setVoto(util);

    iniciar(async () => {
      const res = await votarFaq(faq.id, util);
      if (res.ok && res.helpful !== undefined && res.notHelpful !== undefined) {
        setContadores({ helpful: res.helpful, notHelpful: res.notHelpful });
      } else {
        setVoto(previo.voto);
        setContadores(previo.contadores);
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid #F1F5F9" }}>
      <button
        type="button"
        onClick={onAbrir}
        aria-expanded={abierta}
        className="kc-row-h"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          width: "100%",
          border: "none",
          background: abierta ? "#FCFDFE" : "transparent",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--kc-font)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "var(--kc-faq-soft)",
            color: "var(--kc-faq-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          ?
        </span>

        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--kc-ink)",
            lineHeight: 1.4,
          }}
        >
          {faq.question}
        </span>

        <span
          aria-hidden="true"
          style={{
            color: "var(--kc-ink-4)",
            flexShrink: 0,
            transform: abierta ? "rotate(90deg)" : "none",
            transition: "transform .22s",
            display: "flex",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </button>

      {abierta && (
        <div className="kc-fade" style={{ padding: "0 18px 18px 56px" }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--kc-ink-2)",
              margin: 0,
              lineHeight: 1.65,
            }}
          >
            {faq.answer}
          </p>

          {faq.steps.length > 0 && (
            <ol style={{ margin: "14px 0 0", padding: "0 0 0 18px" }}>
              {faq.steps.map((paso, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 12.5,
                    color: "var(--kc-ink-2)",
                    lineHeight: 1.6,
                    marginBottom: 5,
                  }}
                >
                  {paso}
                </li>
              ))}
            </ol>
          )}

          {/* Enlaces a lo relacionado: la respuesta corta más el documento
              completo, que es donde está el detalle. */}
          {(faq.resourceCode || faq.trainingId || faq.toolId) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {faq.resourceCode && (
                <Enlace href={marcarOrigen(`/biblioteca/${encodeURIComponent(faq.resourceCode)}`, "faq")}>
                  Ver el documento
                </Enlace>
              )}
              {faq.trainingId && (
                <Enlace href={marcarOrigen(`/capacitaciones/${faq.trainingId}`, "faq")}>
                  Ver la capacitación
                </Enlace>
              )}
              {faq.toolId && (
                <Enlace href={marcarOrigen(`/herramientas/${faq.toolId}`, "faq")}>
                  Ver la herramienta
                </Enlace>
              )}
            </div>
          )}

          {/* ¿Te sirvió? */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginTop: 16,
              paddingTop: 13,
              borderTop: "1px solid #F1F5F9",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 11.5, color: "var(--kc-ink-3)" }}>¿Te sirvió?</span>

            <BotonVoto activo={voto === true} onClick={() => votar(true)} disabled={pendiente}>
              Sí
            </BotonVoto>
            <BotonVoto activo={voto === false} onClick={() => votar(false)} disabled={pendiente}>
              No
            </BotonVoto>

            {pct !== null && (
              <span style={{ fontSize: 11, color: "var(--kc-ink-4)" }}>
                {pct}% la encontró útil ({contadores.helpful + contadores.notHelpful} votos)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BotonVoto({
  children,
  activo,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  activo: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      className="kc-btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${activo ? "rgba(50,214,107,.5)" : "var(--kc-line)"}`,
        background: activo ? "var(--kc-cap-soft)" : "#fff",
        color: activo ? "var(--kc-cap-ink)" : "var(--kc-ink-2)",
        fontSize: 11.5,
        fontWeight: 600,
        padding: "6px 13px",
        borderRadius: 9,
      }}
    >
      {children}
    </button>
  );
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="kc-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid var(--kc-line)",
        background: "#fff",
        color: "var(--kc-ink)",
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
