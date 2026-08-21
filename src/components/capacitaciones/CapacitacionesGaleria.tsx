"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/layout/icons";
import type { Capacitacion } from "@/modules/capacitaciones/domain/capacitacion";
import { normalizar } from "@/modules/biblioteca/domain/documento";
import type { FacetasCapacitaciones } from "@/modules/capacitaciones/application/consultar-capacitaciones";

/**
 * La galería de capacitaciones.
 *
 * Es una FUENTE DE CONSULTA: aquí no hay avance, ni "completada", ni marcar
 * visto. Alguien necesita el video de revisiones o la presentación de Dynamo y
 * viene a buscarlo. Lo que se muestra es qué contiene cada una —cuántos videos,
 * cuántos documentos— para poder elegir sin abrirlas todas.
 *
 * Filtra en el cliente porque son decenas y ya están en memoria: explorar es
 * una actividad de tanteo y esperar al servidor en cada clic la volvería
 * tediosa.
 */
export function CapacitacionesGaleria({
  items,
  facetas,
}: {
  items: Capacitacion[];
  facetas: FacetasCapacitaciones;
}) {
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [nivel, setNivel] = useState("Todos");
  const [software, setSoftware] = useState("Todos");

  const visibles = useMemo(() => {
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);

    return items.filter((cap) => {
      if (categoria !== "Todas" && cap.category !== categoria) return false;
      if (nivel !== "Todos" && cap.level !== nivel) return false;
      if (software !== "Todos" && cap.software !== software) return false;

      if (palabras.length === 0) return true;
      // Se busca también en los temas: quien escribe "nubes de revisión" busca
      // el tema, no el curso, y encontrarlo solo por el título fallaría.
      const heno = normalizar(
        [
          cap.title,
          cap.summary,
          cap.instructor,
          cap.category,
          cap.software,
          ...cap.objectives,
          ...cap.temas.map((t) => t.title),
          ...cap.temas.flatMap((t) => t.materials.map((m) => m.title)),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return palabras.every((p) => heno.includes(p));
    });
  }, [items, q, categoria, nivel, software]);

  const hayFiltro =
    q.trim() !== "" || categoria !== "Todas" || nivel !== "Todos" || software !== "Todos";

  return (
    <>
      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div
        className="kc-panel kc-rise"
        style={{
          padding: "12px 14px",
          marginBottom: 16,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label
          style={{
            flex: 1,
            minWidth: 220,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid var(--kc-line)",
            borderRadius: 10,
            padding: "0 11px",
            height: 36,
            background: "#F8FAFC",
            cursor: "text",
          }}
        >
          <span style={{ color: "var(--kc-ink-4)", display: "flex" }}>
            <Icon name="search" size={13} />
          </span>
          <span className="kc-sr">Buscar capacitación</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tema, instructor, material…"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--kc-font)",
              fontSize: 12,
              color: "var(--kc-ink)",
            }}
          />
        </label>

        <Selector
          etiqueta="Categoría"
          valor={categoria}
          onChange={setCategoria}
          opciones={["Todas", ...facetas.categorias]}
        />
        <Selector
          etiqueta="Nivel"
          valor={nivel}
          onChange={setNivel}
          opciones={["Todos", ...facetas.niveles]}
        />
        <Selector
          etiqueta="Software"
          valor={software}
          onChange={setSoftware}
          opciones={["Todos", ...facetas.softwares]}
        />

        {hayFiltro && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCategoria("Todas");
              setNivel("Todos");
              setSoftware("Todos");
            }}
            className="kc-btn"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--kc-ink-3)",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "8px 6px",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Galería ─────────────────────────────────────────────────────── */}
      {visibles.length === 0 ? (
        <p
          className="kc-panel"
          style={{
            padding: "34px 20px",
            textAlign: "center",
            fontSize: 12.5,
            color: "var(--kc-ink-3)",
            margin: 0,
          }}
        >
          Ninguna capacitación coincide con esos filtros.
        </p>
      ) : (
        <div
          className="kc-rise"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(292px,1fr))",
            gap: 15,
          }}
        >
          {visibles.map((cap) => (
            <TarjetaCapacitacion key={cap.id} cap={cap} />
          ))}
        </div>
      )}
    </>
  );
}

function TarjetaCapacitacion({ cap }: { cap: Capacitacion }) {
  // Qué contiene: es lo que ayuda a decidir si esta capacitación tiene lo que
  // se busca, y sustituye al porcentaje que antes ocupaba este sitio.
  const videos = cap.temas.filter((t) => t.videoUrl).length;
  const materiales = cap.temas.reduce((n, t) => n + t.materials.length, 0);

  return (
    <Link
      href={`/capacitaciones/${cap.id}`}
      className="kc-panel kc-lift"
      style={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        overflow: "hidden",
      }}
    >
      {/* La cabecera de color es la portada: sin miniaturas reales, el acento
          del curso es lo que lo hace distinguible en la cuadrícula. */}
      <div
        style={{
          height: 96,
          background: `linear-gradient(135deg, #0E2138, ${cap.accent}22)`,
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          padding: "0 15px 11px",
          overflow: "hidden",
        }}
      >
        <GrafoPortada color={cap.accent} />

        <span
          style={{
            position: "relative",
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {cap.category && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: "#fff",
                background: "rgba(255,255,255,.16)",
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              {cap.category}
            </span>
          )}
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: "#fff",
              background: "rgba(255,255,255,.16)",
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            {cap.level}
          </span>
        </span>
      </div>

      <div
        style={{
          padding: "13px 15px 15px",
          display: "flex",
          flexDirection: "column",
          gap: 9,
          flex: 1,
        }}
      >
        <h2
          className="kc-clamp-2"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--kc-ink)",
            margin: 0,
            letterSpacing: "-.018em",
            lineHeight: 1.32,
          }}
        >
          {cap.title}
        </h2>

        {cap.summary && (
          <p
            className="kc-clamp-2"
            style={{ fontSize: 11.5, color: "var(--kc-ink-3)", margin: 0, lineHeight: 1.5 }}
          >
            {cap.summary}
          </p>
        )}

        {/* Qué hay dentro. */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 10.5,
            color: "var(--kc-ink-3)",
            marginTop: "auto",
            paddingTop: 6,
          }}
        >
          {videos > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <IconoPlay />
              {videos} {videos === 1 ? "video" : "videos"}
            </span>
          )}
          {materiales > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <IconoDoc />
              {materiales} {materiales === 1 ? "documento" : "documentos"}
            </span>
          )}
          {cap.duration && <span>{cap.duration}</span>}
        </div>

        {cap.instructor && (
          <span
            style={{
              fontSize: 11,
              color: "var(--kc-ink-4)",
              borderTop: "1px solid #F1F5F9",
              paddingTop: 9,
            }}
          >
            {cap.instructor}
          </span>
        )}
      </div>
    </Link>
  );
}

/** El grafo de fondo de la portada, en el color del curso. */
function GrafoPortada({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 300 96"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}
    >
      <g fill="none" stroke={color} strokeWidth="1" opacity=".45">
        <path d="M20 70 L80 44 L140 56 L200 30 L260 46" />
        <path d="M80 44 L96 20 L160 14" />
      </g>
      <g fill={color}>
        <circle cx="80" cy="44" r="3.5" />
        <circle cx="200" cy="30" r="4.5" />
        <circle cx="160" cy="14" r="3" />
      </g>
      <g fill={color} opacity=".7">
        <circle cx="20" cy="70" r="2.6" />
        <circle cx="140" cy="56" r="2.8" />
        <circle cx="260" cy="46" r="2.8" />
      </g>
    </svg>
  );
}

function IconoPlay() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconoDoc() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

/**
 * La barra de avance.
 *
 * Vive aquí porque nació con la galería, pero ya solo la usa la RUTA: las
 * capacitaciones no llevan avance. Se mantiene exportada para no duplicarla.
 */
export function Barra({ pct, color = "var(--kc-green)" }: { pct: number; color?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height: 5, borderRadius: 20, background: "#EDF2F7", overflow: "hidden" }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 20,
          transition: "width .4s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}

function Selector({
  etiqueta,
  valor,
  onChange,
  opciones,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: string[];
}) {
  // Un solo valor posible no es una elección: el filtro se esconde en vez de
  // ofrecer un desplegable que no hace nada.
  if (opciones.length <= 1) return null;

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="kc-sr">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid var(--kc-line)",
          borderRadius: 10,
          height: 36,
          padding: "0 9px",
          fontFamily: "var(--kc-font)",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--kc-ink-2)",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
