"use client";

import { useState, useTransition } from "react";
import {
  agregarEtapa,
  agregarItemRuta,
  borrarEtapa,
  borrarItemRuta,
} from "@/app/(app)/admin/acciones";
import type { Ruta } from "@/modules/rutas/domain/ruta";
import { ErrorAccion, entrada } from "./campos";

type CapBreve = { id: string; title: string; duration: string | null };

/**
 * El editor de la estructura de una ruta: etapas y sus elementos.
 *
 * Un elemento puede ser una capacitación —elegida de una lista, para no
 * teclear ids— o un documento del cronograma, referenciado por su código. Son
 * las dos únicas formas: cualquier otra cosa no tendría dónde abrirse.
 */
export function EditorRuta({
  ruta,
  capacitaciones,
}: {
  ruta: Ruta;
  capacitaciones: CapBreve[];
}) {
  const [error, setError] = useState<string | null>(null);

  async function nuevaEtapa(form: FormData) {
    const res = await agregarEtapa(ruta.id, form);
    setError(res.ok ? null : (res.error ?? "No se pudo agregar la etapa."));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ruta.etapas.map((etapa, i) => (
        <section key={etapa.id} className="kc-panel kc-rise" style={{ overflow: "hidden" }}>
          <header
            style={{
              padding: "13px 16px",
              borderBottom: "1px solid #EDF2F7",
              display: "flex",
              alignItems: "center",
              gap: 11,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "var(--kc-tool-soft)",
                color: "var(--kc-tool-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--kc-ink)",
                }}
              >
                {etapa.name}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
                {etapa.code} · {etapa.items.length}{" "}
                {etapa.items.length === 1 ? "elemento" : "elementos"}
              </span>
            </span>

            <BotonConfirmar
              onConfirmar={() => borrarEtapa(etapa.id, ruta.id)}
              etiqueta="Borrar etapa"
            />
          </header>

          {etapa.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderTop: "1px solid #F1F5F9",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: item.trainingId ? "var(--kc-cap-ink)" : "var(--kc-doc-ink)",
                  background: item.trainingId ? "var(--kc-cap-soft)" : "var(--kc-doc-soft)",
                  borderRadius: 6,
                  padding: "3px 7px",
                  flexShrink: 0,
                }}
              >
                {item.trainingId ? "CAP" : "DOC"}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  color: "var(--kc-ink)",
                  fontWeight: 500,
                }}
              >
                {item.title}
              </span>
              {item.duration && (
                <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)", flexShrink: 0 }}>
                  {item.duration}
                </span>
              )}
              <BotonConfirmar
                onConfirmar={() => borrarItemRuta(item.id, ruta.id)}
                etiqueta="Quitar"
                sutil
              />
            </div>
          ))}

          <FormularioItem etapaId={etapa.id} rutaId={ruta.id} capacitaciones={capacitaciones} />
        </section>
      ))}

      {/* Nueva etapa */}
      <form
        action={nuevaEtapa}
        className="kc-panel kc-rise"
        style={{ padding: "15px 16px", borderStyle: "dashed" }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--kc-ink)",
            margin: "0 0 10px",
          }}
        >
          Agregar etapa
        </p>

        <ErrorAccion mensaje={error} />

        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 9 }}>
          <input
            name="code"
            placeholder="Etapa 1"
            defaultValue={`Etapa ${ruta.etapas.length + 1}`}
            style={{ ...entrada, fontSize: 11.5, padding: "8px 10px" }}
          />
          <input
            name="name"
            required
            placeholder="Fundamentos"
            style={{ ...entrada, fontSize: 11.5, padding: "8px 10px" }}
          />
        </div>

        <input
          name="description"
          placeholder="Qué se consigue en esta etapa"
          style={{ ...entrada, fontSize: 11.5, padding: "8px 10px", marginTop: 9 }}
        />

        <button
          type="submit"
          className="kc-btn"
          style={{
            marginTop: 10,
            border: "1px solid var(--kc-line)",
            background: "#fff",
            color: "var(--kc-ink)",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "8px 15px",
            borderRadius: 9,
          }}
        >
          Agregar etapa
        </button>
      </form>
    </div>
  );
}

/** Añadir un elemento a una etapa. */
function FormularioItem({
  etapaId,
  rutaId,
  capacitaciones,
}: {
  etapaId: string;
  rutaId: string;
  capacitaciones: CapBreve[];
}) {
  const [tipo, setTipo] = useState<"cap" | "doc">("cap");
  const [error, setError] = useState<string | null>(null);

  async function enviar(form: FormData) {
    // El título se rellena solo cuando es una capacitación: escribirlo a mano
    // haría que la ruta mostrara un nombre distinto al del curso.
    if (tipo === "cap") {
      const id = String(form.get("trainingId") ?? "");
      const cap = capacitaciones.find((c) => c.id === id);
      if (!cap) {
        setError("Elige una capacitación.");
        return;
      }
      form.set("title", cap.title);
      form.set("duration", cap.duration ?? "");
      form.delete("resourceCode");
    } else {
      form.delete("trainingId");
    }

    const res = await agregarItemRuta(etapaId, rutaId, form);
    setError(res.ok ? null : (res.error ?? "No se pudo agregar."));
  }

  return (
    <form
      action={enviar}
      style={{
        padding: "11px 16px 14px",
        borderTop: "1px solid #F1F5F9",
        background: "#FCFDFE",
      }}
    >
      <ErrorAccion mensaje={error} />

      <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
        <BotonTipo activo={tipo === "cap"} onClick={() => setTipo("cap")}>
          Capacitación
        </BotonTipo>
        <BotonTipo activo={tipo === "doc"} onClick={() => setTipo("doc")}>
          Documento
        </BotonTipo>
      </div>

      {tipo === "cap" ? (
        <select
          name="trainingId"
          required
          defaultValue=""
          style={{ ...entrada, fontSize: 11.5, padding: "8px 10px" }}
        >
          <option value="" disabled>
            Elige una capacitación…
          </option>
          {capacitaciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 9 }}>
          <input
            name="resourceCode"
            required
            placeholder="4.1"
            title="Código del cronograma"
            style={{ ...entrada, fontSize: 11.5, padding: "8px 10px" }}
          />
          <input
            name="title"
            required
            placeholder="Estándar de nomenclatura"
            style={{ ...entrada, fontSize: 11.5, padding: "8px 10px" }}
          />
        </div>
      )}

      <button
        type="submit"
        className="kc-btn"
        style={{
          marginTop: 9,
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink)",
          fontSize: 11,
          fontWeight: 600,
          padding: "7px 13px",
          borderRadius: 8,
        }}
      >
        Agregar a esta etapa
      </button>
    </form>
  );
}

function BotonTipo({
  children,
  activo,
  onClick,
}: {
  children: React.ReactNode;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className="kc-btn"
      style={{
        border: `1px solid ${activo ? "rgba(50,214,107,.5)" : "var(--kc-line)"}`,
        background: activo ? "var(--kc-cap-soft)" : "#fff",
        color: activo ? "var(--kc-cap-ink)" : "var(--kc-ink-3)",
        fontSize: 11,
        fontWeight: 600,
        padding: "6px 11px",
        borderRadius: 8,
      }}
    >
      {children}
    </button>
  );
}

/** Botón que exige un segundo clic para acciones que no se deshacen. */
function BotonConfirmar({
  onConfirmar,
  etiqueta,
  sutil,
}: {
  onConfirmar: () => Promise<unknown>;
  etiqueta: string;
  sutil?: boolean;
}) {
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
          await onConfirmar();
        });
      }}
      className="kc-btn"
      style={{
        border: sutil
          ? "none"
          : `1px solid ${confirmando ? "rgba(194,56,64,.45)" : "var(--kc-line)"}`,
        background: confirmando && !sutil ? "#FCE9EA" : "transparent",
        color: confirmando ? "#C23840" : "var(--kc-ink-4)",
        fontSize: 10.5,
        fontWeight: 600,
        padding: sutil ? "4px 7px" : "6px 10px",
        borderRadius: 8,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {confirmando ? "¿Seguro?" : etiqueta}
    </button>
  );
}
