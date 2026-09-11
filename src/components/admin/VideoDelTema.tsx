"use client";

import { useState, useTransition } from "react";
import { cambiarVideoTema } from "@/app/(app)/admin/acciones";
import type { Tema } from "@/modules/capacitaciones/domain/capacitacion";
import { entrada } from "./campos";

/**
 * El video de un tema, en la edición: cuál es, dónde vive y cómo cambiarlo.
 *
 * Antes la fila solo decía «con video», y con eso no se podía hacer nada: ni
 * comprobar a dónde apuntaba, ni abrirlo para ver si seguía existiendo, ni
 * corregirlo sin borrar el tema entero y rehacerlo.
 *
 * DÓNDE VIVE ES LO QUE MÁS IMPORTA de esta vista. Un video copiado a la carpeta
 * del Centro es nuestro y no se va a mover; uno que sigue en el Drive de quien
 * grabó depende de esa persona, y es el que un día deja de abrirse. Distinguir
 * los dos de un vistazo es lo que permite arreglarlo antes de que alguien se
 * tope con el error.
 */
export function VideoDelTema({ tema, capId }: { tema: Tema; capId: string }) {
  const [editando, setEditando] = useState(false);
  const [enlace, setEnlace] = useState(tema.videoUrl ?? "");
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    setAviso(null);
    iniciar(async () => {
      const res = await cambiarVideoTema(tema.id, capId, enlace);

      // `ok` con mensaje es un aviso: se guardó, pero algo secundario no salió.
      if (res.ok && res.error) setAviso(res.error);
      else if (!res.ok) setAviso(res.error ?? "No se pudo cambiar el video.");
      else setEditando(false);
    });
  }

  /* ── Cambiando ─────────────────────────────────────────────────────── */

  if (editando) {
    return (
      <div style={caja}>
        <label style={etiqueta}>Enlace del video</label>
        <input
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          placeholder="https://drive.google.com/file/d/…/view"
          style={{ ...entrada, marginBottom: 8 }}
        />
        <p style={pista}>
          De Drive se copia a la carpeta del Centro. Déjalo vacío para quitar el video.
        </p>

        {aviso && <p style={avisoEstilo}>{aviso}</p>}

        <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
          <button
            type="button"
            onClick={guardar}
            disabled={pendiente}
            className="kc-btn"
            style={{ ...boton, background: "var(--kc-green-solid,#178A49)", color: "#fff", border: "none" }}
          >
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setEnlace(tema.videoUrl ?? "");
              setAviso(null);
            }}
            disabled={pendiente}
            className="kc-btn"
            style={boton}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  /* ── Sin video ─────────────────────────────────────────────────────── */

  if (!tema.videoUrl) {
    return (
      <div style={caja}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--kc-ink-3)", flex: 1, minWidth: 140 }}>
            Este tema no tiene video.
          </span>
          <button type="button" onClick={() => setEditando(true)} className="kc-btn" style={boton}>
            Poner uno
          </button>
        </div>
      </div>
    );
  }

  /* ── Con video ─────────────────────────────────────────────────────── */

  return (
    <div style={caja}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
        <span style={etiqueta}>Video</span>

        {tema.videoPropio ? (
          <span style={{ ...sello, background: "#E4F8EB", color: "#178A49" }}>
            en la carpeta del Centro
          </span>
        ) : (
          <span style={{ ...sello, background: "#FDF3DC", color: "#8A6410" }}>
            en el Drive de origen
          </span>
        )}
      </div>

      <a
        href={tema.videoUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "block",
          fontSize: 11,
          color: "var(--kc-ink-2)",
          wordBreak: "break-all",
          textDecoration: "none",
          padding: "7px 9px",
          background: "#fff",
          border: "1px solid var(--kc-line)",
          borderRadius: 8,
          lineHeight: 1.45,
        }}
      >
        {tema.videoUrl}
      </a>

      {!tema.videoPropio && (
        <p style={pista}>
          Depende del Drive de quien lo grabó. Si un día deja de abrirse, es por eso:
          cámbialo por una copia en la carpeta del Centro.
        </p>
      )}

      {aviso && <p style={avisoEstilo}>{aviso}</p>}

      <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setEditando(true)} className="kc-btn" style={boton}>
          Cambiar
        </button>
        <a href={tema.videoUrl} target="_blank" rel="noreferrer" className="kc-btn" style={boton}>
          Abrir en Drive
        </a>
      </div>
    </div>
  );
}

/* ── Estilos ─────────────────────────────────────────────────────────── */

const caja: React.CSSProperties = {
  padding: "11px 12px",
  background: "#F7FAFC",
  border: "1px solid var(--kc-line)",
  borderRadius: 10,
  marginBottom: 12,
};

const etiqueta: React.CSSProperties = {
  display: "block",
  fontSize: 10.5,
  fontWeight: 600,
  color: "var(--kc-ink-2)",
  marginBottom: 5,
};

const sello: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: 5,
};

const pista: React.CSSProperties = {
  fontSize: 10.5,
  color: "var(--kc-ink-4)",
  margin: "6px 0 0",
  lineHeight: 1.5,
};

const boton: React.CSSProperties = {
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink-2)",
  fontSize: 11,
  fontWeight: 600,
  padding: "6px 11px",
  borderRadius: 8,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const avisoEstilo: React.CSSProperties = {
  margin: "8px 0 0",
  padding: "7px 9px",
  background: "#FDF3DC",
  color: "#8A6410",
  borderRadius: 7,
  fontSize: 11,
  lineHeight: 1.5,
};
