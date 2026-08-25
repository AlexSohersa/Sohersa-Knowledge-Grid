"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/layout/icons";
import {
  filtrar,
  opcionesDe,
  type Faq,
  type OpcionFiltro,
} from "@/modules/faq/domain/faq";

/**
 * La pantalla principal del FAQ: filtros a la izquierda, resultados a la
 * derecha.
 *
 * Sigue el borrador de Estandarización y Calidad, con una diferencia
 * deliberada: el mockup lleva arriba el nombre del portal, un buscador propio,
 * un bloque grande y accesos rápidos. Aquí no van —el armazón del Centro ya
 * pone la barra superior con su buscador y el riel de navegación—, y repetirlos
 * dejaría dos buscadores en la misma pantalla.
 *
 * Los filtros se resuelven EN EL CLIENTE sobre la lista completa. Son 78
 * fichas: caben de sobra, y filtrar sin ir al servidor hace que marcar una
 * casilla se sienta instantáneo. Si el catálogo creciera a miles, esto se
 * movería al repositorio.
 *
 * SOBRE LOS NOMBRES DE LOS FILTROS. En pantalla se llaman CATEGORÍA y
 * SUBCATEGORÍA, pero por dentro son `platform` y `category`: son los nombres
 * que usa el Excel del área, y renombrarlos en la base obligaría a traducir en
 * cada importación —justo donde se cuelan los errores—. La traducción vive
 * aquí, en la única capa que la gente ve.
 */
export function FaqExplorador({ faqs }: { faqs: Faq[] }) {
  const [plataforma, setPlataforma] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [q, setQ] = useState("");

  /*
   * Las opciones de cada filtro se cuentan sobre lo que el OTRO filtro deja
   * pasar, no sobre el total. Así, al elegir Revit, cada categoría dice cuántas
   * fichas de Revit tiene; con el total global se podría elegir una
   * combinación que no devuelve nada.
   */
  const plataformas = useMemo(
    () => opcionesDe(filtrar(faqs, { categoria: categoria ?? undefined }), "platform"),
    [faqs, categoria],
  );

  const categorias = useMemo(
    () => opcionesDe(filtrar(faqs, { plataforma: plataforma ?? undefined }), "category"),
    [faqs, plataforma],
  );

  const resultados = useMemo(
    () =>
      filtrar(faqs, {
        plataforma: plataforma ?? undefined,
        categoria: categoria ?? undefined,
        busqueda: q,
      }),
    [faqs, plataforma, categoria, q],
  );

  const hayFiltro = Boolean(plataforma || categoria || q.trim());

  return (
    <div style={{ display: "grid", gridTemplateColumns: "236px minmax(0,1fr)", gap: 22, alignItems: "start" }}>
      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <aside className="kc-panel kc-sticky" style={{ padding: "16px 15px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".1em",
            color: "var(--kc-ink-4)",
            marginBottom: 12,
          }}
        >
          FILTROS
        </div>

        {/* Buscar dentro del catálogo: por código o por palabra clave. */}
        <div style={{ position: "relative", marginBottom: 18 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código o palabra…"
            aria-label="Buscar en las preguntas frecuentes"
            style={{
              width: "100%",
              fontSize: 12,
              fontFamily: "var(--kc-font)",
              padding: "8px 10px 8px 28px",
              borderRadius: 9,
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink)",
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 9, top: 8, color: "var(--kc-ink-4)" }}>
            <Icon name="search" size={13} />
          </span>
        </div>

        <GrupoFiltro
          titulo="CATEGORÍA"
          opciones={plataformas}
          elegida={plataforma}
          onElegir={setPlataforma}
        />

        <GrupoFiltro
          titulo="SUBCATEGORÍA"
          opciones={categorias}
          elegida={categoria}
          onElegir={setCategoria}
        />

        {hayFiltro && (
          <button
            type="button"
            onClick={() => {
              setPlataforma(null);
              setCategoria(null);
              setQ("");
            }}
            className="kc-btn"
            style={{
              marginTop: 14,
              width: "100%",
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink-3)",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "8px 10px",
              borderRadius: 9,
            }}
          >
            Quitar filtros
          </button>
        )}
      </aside>

      {/* ── Resultados ──────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".09em",
              color: "var(--kc-ink-4)",
              margin: 0,
            }}
          >
            PROBLEMAS FRECUENTES
          </h2>
          <span style={{ fontSize: 11.5, color: "var(--kc-ink-4)" }}>
            {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
          </span>
        </div>

        {resultados.length === 0 ? (
          <div
            className="kc-panel"
            style={{ padding: "34px 24px", textAlign: "center" }}
          >
            <p style={{ fontSize: 13.5, color: "var(--kc-ink-2)", margin: "0 0 6px", fontWeight: 600 }}>
              Nada coincide con lo que buscas
            </p>
            <p style={{ fontSize: 12, color: "var(--kc-ink-4)", margin: "0 0 16px", lineHeight: 1.55 }}>
              Prueba con otra palabra, o propón la ficha: si te pasó a ti, le va a
              pasar a alguien más.
            </p>
            <Link
              href="/faq/proponer"
              className="kc-btn"
              style={{
                display: "inline-flex",
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                padding: "10px 17px",
                borderRadius: 10,
                textDecoration: "none",
                boxShadow: "var(--kc-shadow-btn)",
              }}
            >
              Proponer una ficha
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {resultados.map((f, i) => (
              <FilaResultado key={f.id} faq={f} orden={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Un grupo de casillas con su cuenta. */
function GrupoFiltro({
  titulo,
  opciones,
  elegida,
  onElegir,
}: {
  titulo: string;
  opciones: OpcionFiltro[];
  elegida: string | null;
  onElegir: (v: string | null) => void;
}) {
  if (opciones.length === 0) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: ".1em",
          color: "var(--kc-ink-4)",
          marginBottom: 8,
        }}
      >
        {titulo}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {opciones.map((o) => {
          const activa = elegida === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              /* Volver a pulsar la opción activa la quita: es el gesto que la
                 gente intenta antes de buscar un botón de «quitar filtro». */
              onClick={() => onElegir(activa ? null : o.valor)}
              className="kc-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                border: "none",
                background: activa ? "var(--kc-faq-soft)" : "transparent",
                color: activa ? "var(--kc-faq-ink)" : "var(--kc-ink-2)",
                fontSize: 12,
                fontWeight: activa ? 600 : 500,
                padding: "6px 8px",
                borderRadius: 7,
                textAlign: "left",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 4,
                  flexShrink: 0,
                  border: activa ? "none" : "1.5px solid var(--kc-line-2)",
                  background: activa ? "var(--kc-faq-ink)" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                {activa && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </span>

              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.valor}
              </span>

              <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)", flexShrink: 0 }}>
                {o.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Una tarjeta de resultado: el código manda, el título explica. */
function FilaResultado({ faq, orden }: { faq: Faq; orden: number }) {
  return (
    <Link
      href={`/faq/${faq.code ?? faq.id}`}
      className="kc-panel kc-lift"
      style={{
        display: "flex",
        alignItems: "stretch",
        textDecoration: "none",
        overflow: "hidden",
        // Solo las primeras entran animadas: escalonar 78 filas dejaría las de
        // abajo apareciendo varios segundos después.
        animationDelay: orden < 12 ? `${orden * 0.02}s` : undefined,
      }}
    >
      {/*
        La banda del código, a la izquierda.
        Es lo que convierte una lista en un catálogo: el ojo baja por la columna
        de códigos, que están alineados y en cifras tabulares, sin tener que
        leer setenta títulos.
      */}
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          width: 84,
          flexShrink: 0,
          padding: "12px 6px",
          background: "var(--kc-faq-soft)",
          borderRight: "1px solid var(--kc-line)",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: ".03em",
            color: "var(--kc-faq-ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {faq.code ?? "FAQ"}
        </span>

        {faq.imageDriveId && (
          <span
            style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".08em", color: "var(--kc-faq-ink)", opacity: 0.7 }}
            title="Incluye captura del error"
          >
            CON IMAGEN
          </span>
        )}
      </span>

      <span style={{ flex: 1, minWidth: 0, padding: "12px 15px" }}>
        <span
          className="kc-clamp-2"
          style={{
            display: "block",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--kc-ink)",
            lineHeight: 1.35,
          }}
        >
          {faq.question}
        </span>

        {faq.symptom && (
          <span
            className="kc-clamp-1"
            style={{ display: "block", fontSize: 11.5, color: "var(--kc-ink-4)", marginTop: 3 }}
          >
            {faq.symptom}
          </span>
        )}

        {/* Las señas de la ficha: dónde pasa y de qué trata. */}
        <span style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {faq.platform && <Seña texto={faq.platform} />}
          <Seña texto={faq.category} tenue />
          {faq.steps.length > 0 && <Seña texto={`${faq.steps.length} pasos`} tenue />}
        </span>
      </span>

      <span
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          paddingRight: 14,
          color: "var(--kc-ink-4)",
          flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </Link>
  );
}

/** Una seña de la ficha: plataforma, categoría, cuántos pasos. */
function Seña({ texto, tenue }: { texto: string; tenue?: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: tenue ? "var(--kc-ink-4)" : "var(--kc-ink-3)",
        background: tenue ? "transparent" : "var(--kc-bg)",
        border: `1px solid ${tenue ? "var(--kc-line)" : "var(--kc-line-2)"}`,
        borderRadius: 6,
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {texto}
    </span>
  );
}
