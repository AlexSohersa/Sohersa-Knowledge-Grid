"use client";

import { useState, useTransition } from "react";
import {
  agregarMaterial,
  agregarTema,
  borrarMaterial,
  borrarTema,
} from "@/app/(app)/admin/acciones";
import { estiloExt } from "@/modules/shared/domain/conocimiento";
import type { Capacitacion, Tema } from "@/modules/capacitaciones/domain/capacitacion";
import { BotonEnviar, Campo, ErrorAccion, TituloFormulario, entrada } from "./campos";

/**
 * El temario en edición: agregar temas y colgarles material.
 *
 * Cada tema se expande para mostrar su material y el formulario para añadir
 * más. Tener todo en una pantalla —en vez de navegar a cada tema— importa
 * porque armar un curso es una tarea de ida y vuelta: se agrega un tema, se le
 * cuelga el PDF, se corrige el orden.
 */
export function EditorTemas({ cap }: { cap: Capacitacion }) {
  const [abierto, setAbierto] = useState<string | null>(cap.temas[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  async function nuevoTema(form: FormData) {
    const res = await agregarTema(cap.id, form);
    setError(res.ok ? null : (res.error ?? "No se pudo agregar el tema."));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 340px",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* ── Temario ─────────────────────────────────────────────────────── */}
      <div className="kc-panel kc-rise" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 17px", borderBottom: "1px solid #EDF2F7" }}>
          <h2
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: "var(--kc-ink)",
              margin: 0,
              letterSpacing: "-.016em",
            }}
          >
            Temario
          </h2>
          <p style={{ fontSize: 11, color: "var(--kc-ink-3)", margin: "3px 0 0" }}>
            {cap.temas.length === 0
              ? "Todavía no hay temas. Agrega el primero con el formulario de al lado."
              : `${cap.temas.length} ${cap.temas.length === 1 ? "tema" : "temas"}, en el orden en que se verán`}
          </p>
        </div>

        {cap.temas.map((t) => (
          <FilaTema
            key={t.id}
            tema={t}
            capId={cap.id}
            abierto={abierto === t.id}
            onAbrir={() => setAbierto(abierto === t.id ? null : t.id)}
          />
        ))}
      </div>

      {/* ── Nuevo tema ──────────────────────────────────────────────────── */}
      <form action={nuevoTema} className="kc-panel kc-rise" style={{ padding: "18px 19px" }}>
        <TituloFormulario ayuda="El número decide el orden en que aparece.">
          Agregar tema
        </TituloFormulario>

        <ErrorAccion mensaje={error} />

        <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 10 }}>
          <Campo etiqueta="Nº">
            <input
              name="code"
              required
              placeholder="01"
              defaultValue={String(cap.temas.length + 1).padStart(2, "0")}
              style={entrada}
            />
          </Campo>
          <Campo etiqueta="Tipo">
            <select name="kind" defaultValue="Video" style={entrada}>
              <option>Video</option>
              <option>Presentación</option>
              <option>Ejercicio</option>
              <option>Lectura</option>
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Título">
          <input name="title" required placeholder="Revisiones: emisión y control" style={entrada} />
        </Campo>

        <Campo etiqueta="Descripción">
          <textarea
            name="summary"
            rows={2}
            placeholder="Qué se cubre en este tema."
            style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
          />
        </Campo>

        <Campo etiqueta="Duración">
          <input name="duration" placeholder="46 min" style={entrada} />
        </Campo>

        <Campo
          etiqueta="Enlace del video"
          ayuda="Drive, YouTube o un enlace directo. Se reconoce solo."
        >
          <input
            name="videoUrl"
            placeholder="https://drive.google.com/file/d/…/view"
            style={entrada}
          />
        </Campo>

        <BotonEnviar pendienteTexto="Agregando…">Agregar tema</BotonEnviar>
      </form>
    </div>
  );
}

function FilaTema({
  tema,
  capId,
  abierto,
  onAbrir,
}: {
  tema: Tema;
  capId: string;
  abierto: boolean;
  onAbrir: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  async function nuevoMaterial(form: FormData) {
    const res = await agregarMaterial(tema.id, capId, form);
    setError(res.ok ? null : (res.error ?? "No se pudo agregar el material."));
  }

  function eliminar() {
    if (!confirmando) {
      setConfirmando(true);
      setTimeout(() => setConfirmando(false), 4000);
      return;
    }
    iniciar(async () => {
      await borrarTema(tema.id, capId);
    });
  }

  return (
    <div style={{ borderTop: "1px solid #F1F5F9" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "12px 17px",
          background: abierto ? "#FCFDFE" : "transparent",
        }}
      >
        <button
          type="button"
          onClick={onAbrir}
          aria-expanded={abierto}
          className="kc-btn"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 11,
            border: "none",
            background: "transparent",
            padding: 0,
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
              background: "#EDF2F7",
              color: "var(--kc-ink-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {tema.code}
          </span>

          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--kc-ink)",
              }}
            >
              {tema.title}
            </span>
            <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
              {[
                tema.kind,
                tema.duration,
                tema.videoUrl ? "con video" : "sin video",
                `${tema.materials.length} ${tema.materials.length === 1 ? "material" : "materiales"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={eliminar}
          disabled={pendiente}
          className="kc-btn"
          style={{
            border: `1px solid ${confirmando ? "rgba(194,56,64,.45)" : "var(--kc-line)"}`,
            background: confirmando ? "#FCE9EA" : "#fff",
            color: confirmando ? "#C23840" : "var(--kc-ink-3)",
            fontSize: 10.5,
            fontWeight: 600,
            padding: "6px 10px",
            borderRadius: 8,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {confirmando ? "¿Seguro?" : "Borrar"}
        </button>
      </div>

      {abierto && (
        <div className="kc-fade" style={{ padding: "0 17px 16px 54px" }}>
          {/* Material ya colgado. */}
          {tema.materials.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {tema.materials.map((m) => {
                const est = estiloExt(m.kind);
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "8px 10px",
                      border: "1px solid var(--kc-line)",
                      borderRadius: 9,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: est.soft,
                        color: est.ink,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 7.5,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {est.ext}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 11.5,
                        color: "var(--kc-ink)",
                        fontWeight: 500,
                      }}
                    >
                      {m.title}
                    </span>
                    <BotonBorrarMaterial materialId={m.id} capId={capId} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Añadir material. */}
          <form
            action={nuevoMaterial}
            style={{
              border: "1px dashed var(--kc-line)",
              borderRadius: 11,
              padding: "13px 14px",
              background: "#FCFDFE",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--kc-ink-2)",
                margin: "0 0 10px",
              }}
            >
              Agregar material de apoyo
            </p>

            <ErrorAccion mensaje={error} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 9 }}>
              <input
                name="title"
                required
                placeholder="Nombre del material"
                style={{ ...entrada, fontSize: 11.5, padding: "8px 10px" }}
              />
              <select
                name="kind"
                defaultValue="PDF"
                style={{ ...entrada, fontSize: 11.5, padding: "8px 10px" }}
              >
                <option>PDF</option>
                <option>PPT</option>
                <option>XLS</option>
                <option>RVT</option>
                <option>ZIP</option>
                <option>CANVA</option>
                <option>LINK</option>
              </select>
            </div>

            <input
              name="url"
              placeholder="Enlace (Drive, Canva, etc.)"
              style={{ ...entrada, fontSize: 11.5, padding: "8px 10px", marginTop: 9 }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--kc-ink-2)",
                  cursor: "pointer",
                }}
              >
                <input type="checkbox" name="downloadable" defaultChecked />
                Se puede descargar
              </label>

              <button
                type="submit"
                className="kc-btn"
                style={{
                  marginLeft: "auto",
                  border: "1px solid var(--kc-line)",
                  background: "#fff",
                  color: "var(--kc-ink)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "7px 14px",
                  borderRadius: 9,
                }}
              >
                Agregar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function BotonBorrarMaterial({ materialId, capId }: { materialId: string; capId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => {
        if (!confirmando) {
          setConfirmando(true);
          setTimeout(() => setConfirmando(false), 4000);
          return;
        }
        iniciar(async () => {
          await borrarMaterial(materialId, capId);
        });
      }}
      className="kc-btn"
      style={{
        border: "none",
        background: "transparent",
        color: confirmando ? "#C23840" : "var(--kc-ink-4)",
        fontSize: 10.5,
        fontWeight: 600,
        padding: "4px 7px",
        borderRadius: 7,
        flexShrink: 0,
      }}
    >
      {confirmando ? "¿Seguro?" : "Quitar"}
    </button>
  );
}
