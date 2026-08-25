"use client";

import { useState, useTransition } from "react";
import { aceptarComentario, rechazarComentario } from "@/app/(app)/admin/acciones";
import { RevisarPropuesta } from "./RevisarPropuesta";
import type { Comentario, Propuesta } from "@/modules/faq/application/ports";

/**
 * La bandeja de Estandarización y Calidad: lo que el equipo propuso y comentó.
 *
 * Va ARRIBA de las fichas ya publicadas, y no en una pestaña aparte, porque es
 * lo único de esta pantalla que tiene a alguien esperando respuesta. Lo demás
 * —editar una ficha existente— puede esperar a mañana.
 */
export function BandejaPropuestas({
  propuestas,
  comentarios,
  categorias,
  plataformas,
  codigosUsados,
}: {
  propuestas: Propuesta[];
  comentarios: Comentario[];
  /** Las subcategorías que ya existen, para clasificar al aprobar. */
  categorias: string[];
  /** Las categorías (software) del catálogo. */
  plataformas: string[];
  /** Los códigos que ya existen, para proponer el siguiente. */
  codigosUsados: string[];
}) {
  const pendientes = propuestas.filter((p) => p.status === "PENDIENTE");

  if (pendientes.length === 0 && comentarios.length === 0) return null;

  return (
    <section style={{ marginBottom: 26 }}>
      {pendientes.length > 0 && (
        <>
          <Titulo n={pendientes.length} texto="PROPUESTAS POR REVISAR" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {pendientes.map((p) => (
              <FilaPropuesta
                key={p.id}
                propuesta={p}
                categorias={categorias}
                plataformas={plataformas}
                codigosUsados={codigosUsados}
              />
            ))}
          </div>
        </>
      )}

      {comentarios.length > 0 && (
        <>
          <Titulo n={comentarios.length} texto="COMENTARIOS POR REVISAR" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comentarios.map((c) => (
              <FilaComentario key={c.id} comentario={c} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Titulo({ n, texto }: { n: number; texto: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: "var(--kc-ink-4)", margin: 0 }}>
        {texto}
      </h2>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          background: "var(--kc-faq-ink)",
          borderRadius: 99,
          padding: "2px 7px",
        }}
      >
        {n}
      </span>
    </div>
  );
}

/**
 * Una propuesta en la bandeja.
 *
 * La fila solo resume; decidir se hace en la pantalla de revisión, que muestra
 * la ficha como quedará y deja corregirla. Aprobar a ciegas desde una fila
 * llevaba a publicar textos que había que arreglar acto seguido.
 */
function FilaPropuesta({
  propuesta,
  categorias,
  plataformas,
  codigosUsados,
}: {
  propuesta: Propuesta;
  categorias: string[];
  plataformas: string[];
  codigosUsados: string[];
}) {
  const [revisando, setRevisando] = useState(false);

  return (
    <div>
      <div className="kc-panel" style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--kc-ink)", margin: "0 0 4px", lineHeight: 1.35 }}>
              {propuesta.title}
            </p>
            <p className="kc-clamp-2" style={{ fontSize: 12, color: "var(--kc-ink-3)", margin: "0 0 7px", lineHeight: 1.55 }}>
              {propuesta.description}
            </p>

            <p style={{ fontSize: 11, color: "var(--kc-ink-4)", margin: 0 }}>
              {propuesta.authorName}
              {propuesta.authorArea ? ` · ${propuesta.authorArea}` : ""}
              {propuesta.platform ? ` · ${propuesta.platform}` : ""}
              {propuesta.imageName ? " · con captura" : ""}
            </p>
          </div>

          {!revisando && (
            <button
              type="button"
              onClick={() => setRevisando(true)}
              className="kc-btn"
              style={{
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "8px 15px",
                borderRadius: 9,
                flexShrink: 0,
              }}
            >
              Revisar
            </button>
          )}
        </div>
      </div>

      {revisando && (
        <RevisarPropuesta
          propuesta={propuesta}
          plataformas={plataformas}
          subcategorias={categorias}
          codigosUsados={codigosUsados}
          onCerrar={() => setRevisando(false)}
        />
      )}
    </div>
  );
}

function FilaComentario({ comentario }: { comentario: Comentario }) {
  const [rechazando, setRechazando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  /*
   * Aceptar es UN CLIC.
   *
   * El comentario ya trae su sitio —la ficha desde la que se escribió— y su
   * texto, así que no hay nada que preguntar. Pedir título y categoría
   * convertía un «sí, tiene razón» en un formulario, que es la forma más segura
   * de que la bandeja se quede sin atender.
   */
  function aceptar() {
    setError(null);
    iniciar(async () => {
      const res = await aceptarComentario(comentario.id);
      if (!res.ok) setError(res.error ?? "No se pudo aceptar.");
    });
  }

  function rechazar(form: FormData) {
    setError(null);
    iniciar(async () => {
      const res = await rechazarComentario(comentario.id, form);
      if (!res.ok) setError(res.error ?? "No se pudo rechazar.");
    });
  }

  return (
    <div className="kc-panel" style={{ padding: "13px 15px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 230 }}>
          <p style={{ fontSize: 12.5, color: "var(--kc-ink-2)", margin: "0 0 5px", lineHeight: 1.55 }}>
            {comentario.message}
          </p>
          <p style={{ fontSize: 11, color: "var(--kc-ink-4)", margin: 0 }}>
            {comentario.authorName}
            {comentario.authorArea ? ` · ${comentario.authorArea}` : ""}
            {comentario.faqId ? " · sobre una ficha" : " · general"}
          </p>
        </div>

        {!rechazando && (
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button
              type="button"
              onClick={aceptar}
              disabled={pendiente}
              className="kc-btn"
              style={{
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "8px 13px",
                borderRadius: 9,
              }}
            >
              {pendiente ? "…" : "Aceptar"}
            </button>
            <button
              type="button"
              onClick={() => setRechazando(true)}
              className="kc-btn"
              style={{
                border: "1px solid var(--kc-line)",
                background: "#fff",
                color: "var(--kc-ink-3)",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "8px 13px",
                borderRadius: 9,
              }}
            >
              Rechazar
            </button>
          </div>
        )}
      </div>

      {rechazando && (
        <form action={rechazar} className="kc-fade" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--kc-line)" }}>
          <textarea
            name="motivo"
            required
            rows={2}
            placeholder="Por qué no se acepta. Lo va a leer quien lo escribió."
            style={{ ...campo, width: "100%", resize: "vertical", marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={pendiente}
              className="kc-btn"
              style={{
                border: "1px solid var(--kc-line)",
                background: "#fff",
                color: "var(--kc-ink-2)",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 9,
              }}
            >
              {pendiente ? "Enviando…" : "Rechazar y avisar"}
            </button>
            <button type="button" onClick={() => setRechazando(false)} className="kc-btn" style={botonPlano}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: "9px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}

const campo: React.CSSProperties = {
  fontSize: 12,
  fontFamily: "var(--kc-font)",
  padding: "8px 11px",
  borderRadius: 9,
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink)",
  outline: "none",
};

const botonPlano: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--kc-ink-4)",
  fontSize: 11.5,
  fontWeight: 600,
  padding: "8px 10px",
  borderRadius: 9,
};
