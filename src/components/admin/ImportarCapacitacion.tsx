"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previsualizarNotas, importarNotas } from "@/app/(app)/admin/acciones";
import type { Propuesta } from "@/modules/capacitaciones/infrastructure/importar";

/**
 * Importar una capacitación desde sus notas de Gemini.
 *
 * VA EN DOS PASOS, y eso es lo importante del diseño. Primero se lee el
 * documento y se ENSEÑA lo que se va a crear; solo después, y con lo que se
 * vea ya corregido, se guarda.
 *
 * Un paso solo —pegar el enlace y que aparezca la capacitación— sería más
 * rápido de usar y peor: lo que sale de un documento generado automáticamente
 * necesita una mirada humana. El instructor, por ejemplo, se deduce de quién
 * conduce la sesión en las notas; acierta casi siempre, pero «casi» no basta
 * para publicarlo sin mirar.
 *
 * Es el mismo criterio que ya se sigue con las propuestas del FAQ: quien
 * aprueba ve la ficha como quedará antes de aceptarla.
 */
export function ImportarCapacitacion() {
  const router = useRouter();
  const [pendiente, transicion] = useTransition();

  const [enlace, setEnlace] = useState("");
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ carpeta: string; avisos: string[] } | null>(null);

  /*
   * Los campos revisables, en estado propio.
   *
   * Se copian de la propuesta al leerla y a partir de ahí mandan ellos: si se
   * leyeran de `propuesta` directamente, escribir en un campo no haría nada
   * porque el objeto no cambia.
   */
  const [titulo, setTitulo] = useState("");
  const [resumen, setResumen] = useState("");
  const [instructor, setInstructor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nivel, setNivel] = useState("Básico");
  const [copiarVideo, setCopiarVideo] = useState(true);
  const [publicar, setPublicar] = useState(true);

  function leer() {
    setError(null);
    setListo(null);

    transicion(async () => {
      const r = await previsualizarNotas(enlace);

      if (!r.ok) {
        setError(r.error);
        setPropuesta(null);
        return;
      }

      setPropuesta(r.propuesta);
      setTitulo(r.propuesta.titulo);
      setResumen(r.propuesta.resumen ?? "");
      setInstructor(r.propuesta.instructor ?? "");
      setCategoria("");
      setNivel("Básico");
      setCopiarVideo(Boolean(r.propuesta.grabacionId));
      setPublicar(true);
    });
  }

  function guardar() {
    if (!propuesta) return;
    setError(null);

    transicion(async () => {
      const r = await importarNotas(propuesta, {
        titulo: titulo.trim(),
        resumen: resumen.trim() || null,
        instructor: instructor.trim() || null,
        categoria: categoria.trim() || null,
        nivel,
        copiarVideo,
        publicar,
      });

      if (!r.ok) {
        setError(r.error);
        return;
      }

      setListo({ carpeta: r.carpeta, avisos: r.avisos });
      setPropuesta(null);
      setEnlace("");
      router.refresh();
    });
  }

  /* ── Ya se importó ─────────────────────────────────────────────────── */

  if (listo) {
    return (
      <div className="kc-panel" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: "#E4F8EB",
              color: "#178A49",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5L20 7" />
            </svg>
          </span>
          <strong style={{ fontSize: 13, color: "var(--kc-ink)" }}>Capacitación importada</strong>
        </div>

        {listo.avisos.length > 0 && (
          <ul
            style={{
              margin: "0 0 12px",
              padding: "10px 12px 10px 26px",
              background: "#FDF3DC",
              borderRadius: 9,
              fontSize: 11.5,
              color: "#8A6410",
              lineHeight: 1.55,
            }}
          >
            {listo.avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={listo.carpeta}
            target="_blank"
            rel="noreferrer"
            className="kc-btn"
            style={botonSecundario}
          >
            Ver la carpeta en Drive
          </a>
          <button type="button" onClick={() => setListo(null)} className="kc-btn" style={botonPrincipal}>
            Importar otra
          </button>
        </div>
      </div>
    );
  }

  /* ── Revisar antes de guardar ──────────────────────────────────────── */

  if (propuesta) {
    return (
      <div className="kc-panel" style={{ padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={etiquetaCodigo}>{propuesta.codigo}</span>
          {propuesta.yaImportada && (
            <span style={{ ...etiquetaCodigo, background: "#FDF3DC", color: "#8A6410", marginLeft: 6 }}>
              ya importada · se actualizará
            </span>
          )}
        </div>

        <Campo etiqueta="Título">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={entrada} />
        </Campo>

        <Campo etiqueta="Resumen">
          <textarea
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            rows={3}
            style={{ ...entrada, resize: "vertical", fontFamily: "inherit" }}
          />
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo
            etiqueta="Impartió"
            pista={propuesta.instructor ? "deducido de las notas" : undefined}
          >
            <input
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Nombre de quien la dio"
              style={entrada}
            />
          </Campo>

          <Campo etiqueta="Categoría">
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="BIM, Habilidades…"
              style={entrada}
            />
          </Campo>
        </div>

        <Campo etiqueta="Nivel">
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} style={entrada}>
            <option>Básico</option>
            <option>Intermedio</option>
            <option>Avanzado</option>
          </select>
        </Campo>

        {/* Lo que se leyó y no se edita aquí: se ve, para saber qué va a entrar. */}
        <div style={resumenLectura}>
          <Dato etiqueta="Temas" valor={String(propuesta.temas.length)} />
          <Dato etiqueta="Objetivos" valor={String(propuesta.objetivos.length)} />
          <Dato etiqueta="Asistentes" valor={propuesta.asistentes ? String(propuesta.asistentes) : "—"} />
          <Dato
            etiqueta="Impartida"
            valor={
              propuesta.fecha
                ? new Date(propuesta.fecha).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "America/Mexico_City",
                  })
                : "—"
            }
          />
        </div>

        <ul style={listaTemas}>
          {propuesta.temas.slice(0, 6).map((t, i) => (
            <li key={i} className="kc-clamp-1">
              {String(i + 1).padStart(2, "0")} · {t.titulo}
            </li>
          ))}
          {propuesta.temas.length > 6 && (
            <li style={{ color: "var(--kc-ink-4)" }}>y {propuesta.temas.length - 6} más…</li>
          )}
        </ul>

        <label style={casilla}>
          <input
            type="checkbox"
            checked={copiarVideo}
            onChange={(e) => setCopiarVideo(e.target.checked)}
            disabled={!propuesta.grabacionId}
          />
          <span>
            Copiar el video a la carpeta del Centro
            {!propuesta.grabacionId && (
              <em style={{ color: "var(--kc-ink-4)", fontStyle: "normal" }}>
                {" "}
                · las notas no enlazan ninguna grabación
              </em>
            )}
          </span>
        </label>

        <label style={casilla}>
          <input type="checkbox" checked={publicar} onChange={(e) => setPublicar(e.target.checked)} />
          <span>Publicarla ya (si no, queda en borrador)</span>
        </label>

        {error && <p style={aviso}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={guardar}
            disabled={pendiente || !titulo.trim()}
            className="kc-btn"
            style={{ ...botonPrincipal, opacity: pendiente || !titulo.trim() ? 0.6 : 1 }}
          >
            {pendiente ? "Importando…" : "Importar"}
          </button>
          <button
            type="button"
            onClick={() => setPropuesta(null)}
            disabled={pendiente}
            className="kc-btn"
            style={botonSecundario}
          >
            Cancelar
          </button>
        </div>

        {pendiente && copiarVideo && (
          <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: "8px 0 0", lineHeight: 1.5 }}>
            Copiar el video puede tardar según lo que pese.
          </p>
        )}
      </div>
    );
  }

  /* ── Pegar el enlace ───────────────────────────────────────────────── */

  return (
    <div className="kc-panel" style={{ padding: 16 }}>
      <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "var(--kc-ink)", margin: "0 0 4px" }}>
        Importar de unas notas
      </h3>
      <p style={{ fontSize: 11, color: "var(--kc-ink-3)", margin: "0 0 12px", lineHeight: 1.55 }}>
        Pega el enlace del documento de notas de Gemini. Se lee con tu cuenta, así
        que funciona con cualquier capacitación que puedas abrir.
      </p>

      <input
        value={enlace}
        onChange={(e) => setEnlace(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && enlace.trim() && !pendiente) leer();
        }}
        placeholder="https://docs.google.com/document/d/…"
        style={entrada}
      />

      {error && <p style={aviso}>{error}</p>}

      <button
        type="button"
        onClick={leer}
        disabled={pendiente || !enlace.trim()}
        className="kc-btn"
        style={{
          ...botonPrincipal,
          width: "100%",
          marginTop: 10,
          opacity: pendiente || !enlace.trim() ? 0.6 : 1,
        }}
      >
        {pendiente ? "Leyendo…" : "Leer las notas"}
      </button>
    </div>
  );
}

/* ── Piezas ──────────────────────────────────────────────────────────── */

function Campo({
  etiqueta,
  pista,
  children,
}: {
  etiqueta: string;
  pista?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--kc-ink-2)" }}>{etiqueta}</span>
        {pista && <span style={{ fontSize: 9.5, color: "var(--kc-ink-4)" }}>{pista}</span>}
      </span>
      {children}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: "var(--kc-ink-4)", marginBottom: 1 }}>{etiqueta}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--kc-ink)" }}>{valor}</div>
    </div>
  );
}

/* ── Estilos ─────────────────────────────────────────────────────────── */

const entrada: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--kc-line)",
  borderRadius: 9,
  padding: "8px 10px",
  fontSize: 12,
  color: "var(--kc-ink)",
  background: "#fff",
  boxSizing: "border-box",
};

const botonPrincipal: React.CSSProperties = {
  border: "none",
  background: "var(--kc-green-solid, #178A49)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  padding: "9px 14px",
  borderRadius: 9,
  cursor: "pointer",
};

const botonSecundario: React.CSSProperties = {
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink-2)",
  fontSize: 12,
  fontWeight: 600,
  padding: "9px 14px",
  borderRadius: 9,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const etiquetaCodigo: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".04em",
  background: "#EDF2F7",
  color: "var(--kc-ink-2)",
  padding: "3px 7px",
  borderRadius: 6,
};

const resumenLectura: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
  gap: 8,
  padding: "10px 12px",
  background: "#F7FAFC",
  borderRadius: 9,
  margin: "4px 0 10px",
};

const listaTemas: React.CSSProperties = {
  margin: "0 0 12px",
  padding: "0 0 0 2px",
  listStyle: "none",
  fontSize: 11,
  color: "var(--kc-ink-3)",
  lineHeight: 1.7,
};

const casilla: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 7,
  fontSize: 11.5,
  color: "var(--kc-ink-2)",
  marginBottom: 7,
  cursor: "pointer",
  lineHeight: 1.45,
};

const aviso: React.CSSProperties = {
  margin: "10px 0 0",
  padding: "8px 10px",
  background: "#FCE9EA",
  color: "#B3383F",
  borderRadius: 8,
  fontSize: 11.5,
  lineHeight: 1.5,
};
