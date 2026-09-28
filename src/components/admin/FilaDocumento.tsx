"use client";

import { useState, useTransition } from "react";
import {
  borrarDocumentoBiblioteca,
  editarDocumentoBiblioteca,
} from "@/app/(app)/admin/acciones";
import { estiloArchivo } from "@/modules/herramientas/domain/descarga";
import { Campo, entrada } from "./campos";

interface Doc {
  id: string;
  code: string | null;
  title: string;
  section: string;
  fileName: string | null;
  sizeBytes: number | null;
  author: string | null;
  training: string | null;
  driveId: string | null;
}

const ESTADOS = ["", "Pendiente", "Agendada", "Impartida"];

/** «2.4 MB». El mismo formato que enseña la biblioteca. */
function tamano(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Un documento manual en la lista de Administración: verlo, corregirlo o
 * retirarlo.
 *
 * El borrado pide confirmación en el propio botón en vez de abrir un diálogo:
 * es la misma forma que ya usan los temas de una capacitación, y evita que un
 * clic de más retire algo de la biblioteca.
 */
export function FilaDocumento({ doc, secciones }: { doc: Doc; secciones: string[] }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const est = estiloArchivo(doc.fileName);

  async function guardar(form: FormData) {
    setError(null);
    const res = await editarDocumentoBiblioteca(doc.id, form);
    if (res.ok) setEditando(false);
    else setError(res.error ?? "No se pudo guardar.");
  }

  function eliminar() {
    if (!confirmando) {
      setConfirmando(true);
      setTimeout(() => setConfirmando(false), 4000);
      return;
    }
    iniciar(async () => {
      const res = await borrarDocumentoBiblioteca(doc.id);
      if (!res.ok) {
        setError(res.error ?? "No se pudo borrar.");
        setConfirmando(false);
      }
    });
  }

  /* ── Corrigiendo ───────────────────────────────────────────────────── */

  if (editando) {
    return (
      <form action={guardar} style={{ borderTop: "1px solid #F1F5F9", padding: "14px 17px" }}>
        {error && (
          <p
            style={{
              margin: "0 0 10px",
              padding: "8px 10px",
              background: "#FCE9EA",
              color: "#B3383F",
              borderRadius: 8,
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        )}

        <Campo etiqueta="Título">
          <input name="title" required defaultValue={doc.title} style={entrada} />
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
          <Campo etiqueta="Sección">
            <select name="section" defaultValue={doc.section} style={entrada}>
              {secciones.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {!secciones.includes(doc.section) && (
                <option value={doc.section}>{doc.section}</option>
              )}
            </select>
          </Campo>
          <Campo etiqueta="Código">
            <input name="code" defaultValue={doc.code ?? ""} style={entrada} />
          </Campo>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo etiqueta="Autor">
            <input name="author" defaultValue={doc.author ?? ""} style={entrada} />
          </Campo>
          <Campo etiqueta="Capacitación">
            <select name="training" defaultValue={doc.training ?? ""} style={entrada}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e || "— ninguna"}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo
          etiqueta="Enlace del archivo"
          ayuda="Déjalo vacío para conservar el actual"
        >
          <input name="enlace" placeholder="https://drive.google.com/file/d/…" style={entrada} />
        </Campo>

        <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
          <button
            type="submit"
            className="kc-btn"
            style={{ ...boton, background: "var(--kc-green-solid,#178A49)", color: "#fff", border: "none" }}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setError(null);
            }}
            className="kc-btn"
            style={boton}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  /* ── En reposo ─────────────────────────────────────────────────────── */

  return (
    <div style={{ borderTop: "1px solid #F1F5F9", padding: "11px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: est.soft,
            color: est.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {est.ext}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--kc-ink)" }}>
            {doc.code && <span style={{ color: "var(--kc-ink-4)" }}>{doc.code} </span>}
            {doc.title}
          </span>
          <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
            {[doc.section, doc.author, tamano(doc.sizeBytes), doc.training]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>

        {doc.driveId && (
          <a
            href={`https://drive.google.com/file/d/${doc.driveId}/view`}
            target="_blank"
            rel="noreferrer"
            className="kc-btn"
            style={boton}
          >
            Abrir
          </a>
        )}

        <button type="button" onClick={() => setEditando(true)} className="kc-btn" style={boton}>
          Editar
        </button>

        <button
          type="button"
          onClick={eliminar}
          disabled={pendiente}
          className="kc-btn"
          style={{
            ...boton,
            border: `1px solid ${confirmando ? "rgba(194,56,64,.45)" : "var(--kc-line)"}`,
            background: confirmando ? "#FCE9EA" : "#fff",
            color: confirmando ? "#C23840" : "var(--kc-ink-3)",
          }}
        >
          {confirmando ? "¿Seguro?" : "Borrar"}
        </button>
      </div>

      {error && (
        <p
          style={{
            margin: "8px 0 0",
            padding: "7px 9px",
            background: "#FCE9EA",
            color: "#B3383F",
            borderRadius: 7,
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const boton: React.CSSProperties = {
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink-2)",
  fontSize: 10.5,
  fontWeight: 600,
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  whiteSpace: "nowrap",
};
