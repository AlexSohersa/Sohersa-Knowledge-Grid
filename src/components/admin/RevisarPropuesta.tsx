"use client";

import { useState, useTransition } from "react";
import { aprobarPropuesta, rechazarPropuesta } from "@/app/(app)/admin/acciones";
import type { Propuesta } from "@/modules/faq/application/ports";
import { prefijoDe, siguienteCodigo } from "@/modules/faq/domain/faq";

/**
 * Revisar una propuesta: verla como quedará y corregirla antes de publicar.
 *
 * Casi ninguna propuesta llega redactada como para publicarse tal cual —quien
 * la manda está describiendo un problema, no escribiendo documentación—, así
 * que aprobar sin poder editar obligaba a publicar mal y arreglar después,
 * dejando la ficha torcida en público durante ese rato.
 *
 * La vista previa muestra la ficha con el aspecto que tendrá en el FAQ. Es lo
 * que permite decidir: leer un formulario no dice si la ficha se entiende, y
 * verla montada sí.
 */
export function RevisarPropuesta({
  propuesta,
  plataformas,
  subcategorias,
  codigosUsados,
  onCerrar,
}: {
  propuesta: Propuesta;
  plataformas: string[];
  subcategorias: string[];
  /** Los códigos que ya existen, para proponer el siguiente de la serie. */
  codigosUsados: string[];
  onCerrar: () => void;
}) {
  /*
   * Lo que se va a publicar, precargado con lo que mandó quien propuso.
   *
   * Se edita aquí y se envía junto: así el administrador ve en la vista previa
   * exactamente lo que va a quedar, no lo que llegó.
   */
  const [v, setV] = useState({
    question: propuesta.title,
    symptom: propuesta.description,
    solution: propuesta.solution ?? "",
    platform: propuesta.platform ?? "",
    category: "",
    code: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function campo(k: keyof typeof v) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV((prev) => ({ ...prev, [k]: e.target.value }));
  }

  function aprobar() {
    setError(null);
    const form = new FormData();
    for (const [k, valor] of Object.entries(v)) form.set(k, valor);

    iniciar(async () => {
      const res = await aprobarPropuesta(propuesta.id, form);
      if (!res.ok) setError(res.error ?? "No se pudo publicar.");
      else onCerrar();
    });
  }

  function rechazar() {
    setError(null);
    const form = new FormData();
    form.set("reviewNote", motivo);

    iniciar(async () => {
      const res = await rechazarPropuesta(propuesta.id, form);
      if (!res.ok) setError(res.error ?? "No se pudo rechazar.");
      else onCerrar();
    });
  }

  /*
   * El código que se va a asignar.
   *
   * Se calcula aquí solo para MOSTRARLO: el definitivo lo pone el servidor al
   * publicar, porque entre que se abre esta pantalla y se pulsa Publicar puede
   * haberse creado otra ficha de la misma serie. Enseñarlo evita la duda de si
   * la ficha va a quedar sin código.
   */
  const codigoAuto = siguienteCodigo(prefijoDe(v.platform || null), codigosUsados);
  const codigoFinal = v.code.trim().toUpperCase() || codigoAuto;

  /* Los pasos, tal como los verá la ficha. */
  const pasos = v.solution
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="kc-panel kc-pop" style={{ overflow: "hidden", marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          background: "var(--kc-bg)",
          borderBottom: "1px solid var(--kc-line)",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: "var(--kc-ink-4)" }}>
          REVISAR ANTES DE PUBLICAR
        </span>
        <span style={{ fontSize: 11, color: "var(--kc-ink-4)", marginLeft: "auto" }}>
          {propuesta.authorName}
          {propuesta.authorArea ? ` · ${propuesta.authorArea}` : ""}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 0 }}>
        {/* ── Lo editable ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 13,
            borderRight: "1px solid var(--kc-line)",
          }}
        >
          <Rotulo texto="TÍTULO">
            <input value={v.question} onChange={campo("question")} style={entrada} />
          </Rotulo>

          <Rotulo texto="SÍNTOMA — QUÉ SE VE">
            <textarea value={v.symptom} onChange={campo("symptom")} rows={3} style={{ ...entrada, resize: "vertical" }} />
          </Rotulo>

          <Rotulo texto="SOLUCIÓN — UN PASO POR LÍNEA">
            <textarea
              value={v.solution}
              onChange={campo("solution")}
              rows={5}
              placeholder={"Ir a Manage → Purge Unused.\nEliminar los vínculos que no se usen."}
              style={{ ...entrada, resize: "vertical" }}
            />
          </Rotulo>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Rotulo texto="CATEGORÍA">
              {/*
                Lo que eligió quien propuso viene precargado y se puede corregir.
                Al cambiarlo, la captura se muda de carpeta en Drive: si no, la
                carpeta diría una cosa y la ficha otra.
              */}
              <select value={v.platform} onChange={campo("platform")} style={entrada}>
                <option value="">Sin clasificar</option>
                {plataformas.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Rotulo>

            <Rotulo texto="SUBCATEGORÍA">
              <select value={v.category} onChange={campo("category")} style={entrada}>
                <option value="">Elige…</option>
                {subcategorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Rotulo>
          </div>

          <Rotulo texto="CÓDIGO">
            <input
              value={v.code}
              onChange={campo("code")}
              placeholder={codigoAuto}
              style={{ ...entrada, fontVariantNumeric: "tabular-nums" }}
            />
            <span style={{ display: "block", fontSize: 10.5, color: "var(--kc-ink-4)", marginTop: 4 }}>
              {v.code.trim()
                ? "Se usará el que escribiste."
                : `Se asignará ${codigoAuto} — el siguiente de la serie. La captura se renombra sola.`}
            </span>
          </Rotulo>
        </div>

        {/* ── Cómo quedará ───────────────────────────────────────────────── */}
        <div style={{ padding: "16px 18px", background: "var(--kc-bg)" }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".11em", color: "var(--kc-ink-4)", marginBottom: 11 }}>
            ASÍ SE VERÁ
          </div>

          <div className="kc-panel" style={{ padding: "14px 15px", background: "#fff" }}>
            {(codigoFinal || v.platform) && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                {codigoFinal && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "var(--kc-faq-ink)",
                      background: "var(--kc-faq-soft)",
                      borderRadius: 6,
                      padding: "4px 9px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {codigoFinal}
                  </span>
                )}
                {v.platform && (
                  <span style={{ fontSize: 11, color: "var(--kc-ink-4)" }}>{v.platform}</span>
                )}
                {v.category && (
                  <span style={{ fontSize: 11, color: "var(--kc-ink-4)" }}>· {v.category}</span>
                )}
              </div>
            )}

            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink)", margin: "0 0 6px", lineHeight: 1.3 }}>
              {v.question || "Sin título"}
            </p>

            {v.symptom && (
              <p style={{ fontSize: 12.5, color: "var(--kc-ink-2)", margin: "0 0 10px", lineHeight: 1.55 }}>
                {v.symptom}
              </p>
            )}

            {propuesta.imageDriveId && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Viene de
                    nuestra ruta con la cuenta de quien mira. */}
                <img
                  src={`/api/imagen/${propuesta.imageDriveId}`}
                  alt="Captura adjunta a la propuesta"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 200,
                    display: "block",
                    borderRadius: 7,
                    border: "1px solid var(--kc-line)",
                    marginBottom: 10,
                  }}
                />
              </>
            )}

            {pasos.length > 0 ? (
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {pasos.map((p, i) => (
                  <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: "var(--kc-faq-soft)",
                        color: "var(--kc-faq-ink)",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--kc-ink-2)", lineHeight: 1.55 }}>{p}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ fontSize: 11.5, color: "var(--kc-ink-4)", margin: 0, fontStyle: "italic" }}>
                Sin pasos. Se publicará con el síntoma como respuesta.
              </p>
            )}
          </div>

          {!v.category && (
            <p style={{ fontSize: 11, color: "var(--kc-faq-ink)", margin: "10px 0 0" }}>
              Falta elegir la subcategoría para poder publicar.
            </p>
          )}
        </div>
      </div>

      {/* ── Decidir ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexWrap: "wrap",
          padding: "12px 16px",
          borderTop: "1px solid var(--kc-line)",
        }}
      >
        {!rechazando ? (
          <>
            <button
              type="button"
              onClick={aprobar}
              disabled={pendiente || !v.category}
              className="kc-btn"
              style={{
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: 9,
              }}
            >
              {pendiente ? "Publicando…" : "Publicar en el FAQ"}
            </button>

            <button
              type="button"
              onClick={() => setRechazando(true)}
              className="kc-btn"
              style={{
                border: "1px solid var(--kc-line)",
                background: "#fff",
                color: "var(--kc-ink-3)",
                fontSize: 12,
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: 9,
              }}
            >
              Rechazar
            </button>

            <button type="button" onClick={onCerrar} className="kc-btn" style={botonPlano}>
              Cerrar
            </button>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué no se publica. Lo va a leer quien la propuso."
              style={{ ...entrada, flex: 1, minWidth: 240 }}
            />
            <button
              type="button"
              onClick={rechazar}
              disabled={pendiente || motivo.trim().length < 5}
              className="kc-btn"
              style={{
                border: "1px solid var(--kc-line)",
                background: "#fff",
                color: "var(--kc-ink-2)",
                fontSize: 12,
                fontWeight: 600,
                padding: "9px 15px",
                borderRadius: 9,
              }}
            >
              {pendiente ? "Enviando…" : "Rechazar y avisar"}
            </button>
            <button type="button" onClick={() => setRechazando(false)} className="kc-btn" style={botonPlano}>
              Cancelar
            </button>
          </div>
        )}

        {error && (
          <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: 0, width: "100%" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Rotulo({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: ".11em",
          color: "var(--kc-ink-4)",
          marginBottom: 6,
        }}
      >
        {texto}
      </div>
      {children}
    </div>
  );
}

const entrada: React.CSSProperties = {
  width: "100%",
  fontSize: 12.5,
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
  fontSize: 12,
  fontWeight: 600,
  padding: "9px 12px",
  borderRadius: 9,
};
