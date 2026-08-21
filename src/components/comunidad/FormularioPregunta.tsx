"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { preguntar, type EstadoFormulario } from "@/app/(app)/comunidad/acciones";

const INICIAL: EstadoFormulario = { ok: false };

/**
 * El formulario de pregunta nueva.
 *
 * La validación vive en el dominio y vuelve por `useActionState`: no se repite
 * en el cliente para que no haya dos reglas que puedan desviarse. Lo que sí
 * hace el navegador es `required`, que es una ayuda inmediata y no una segunda
 * fuente de verdad.
 */
export function FormularioPregunta({
  categorias,
  softwares,
}: {
  categorias: string[];
  softwares: string[];
}) {
  const [estado, accion] = useActionState(preguntar, INICIAL);

  return (
    <form action={accion} className="kc-panel kc-rise" style={{ padding: "20px 22px" }}>
      <Campo
        etiqueta="¿Cuál es tu pregunta?"
        ayuda="Resúmela en una línea, como se la dirías a un compañero."
        error={estado.errores?.title}
      >
        <input
          name="title"
          required
          maxLength={180}
          placeholder="Ej. Las revisiones no aparecen en la lámina aunque ya las emití"
          style={entrada}
        />
      </Campo>

      <Campo
        etiqueta="Explica el problema"
        ayuda="Qué intentaste, qué esperabas y qué pasó. Incluye versión del software si viene al caso."
        error={estado.errores?.body}
      >
        <textarea
          name="body"
          required
          rows={7}
          placeholder="Emití la revisión 3 en el juego de planos ARQ y la nube ya está colocada, pero la tabla de revisiones sigue mostrando solo hasta la 2…"
          style={{ ...entrada, lineHeight: 1.6, resize: "vertical" }}
        />
      </Campo>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
        }}
      >
        <Campo etiqueta="Categoría" error={estado.errores?.category}>
          <select name="category" required defaultValue="" style={entrada}>
            <option value="" disabled>
              Elige una…
            </option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>

        {softwares.length > 0 && (
          <Campo etiqueta="Software" ayuda="Opcional">
            <select name="software" defaultValue="" style={entrada}>
              <option value="">No aplica</option>
              {softwares.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      <Campo etiqueta="Etiquetas" ayuda="Separadas por comas. Ayudan a que otros la encuentren.">
        <input name="tags" placeholder="revisiones, planos, emisión" style={entrada} />
      </Campo>

      {estado.error && !estado.errores && (
        <p role="alert" style={{ fontSize: 12, color: "#C23840", margin: "4px 0 0" }}>
          {estado.error}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <BotonPublicar />
      </div>
    </form>
  );
}

const entrada: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--kc-line)",
  borderRadius: 11,
  padding: "10px 13px",
  fontFamily: "var(--kc-font)",
  fontSize: 12.5,
  color: "var(--kc-ink)",
  outline: "none",
  background: "#fff",
};

function Campo({
  etiqueta,
  ayuda,
  error,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--kc-ink)",
          marginBottom: 3,
        }}
      >
        {etiqueta}
      </label>
      {ayuda && (
        <p style={{ fontSize: 11, color: "var(--kc-ink-4)", margin: "0 0 7px", lineHeight: 1.45 }}>
          {ayuda}
        </p>
      )}
      {children}
      {error && (
        <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: "6px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function BotonPublicar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="kc-btn"
      style={{
        border: "none",
        background: "var(--kc-green-solid)",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 600,
        padding: "11px 20px",
        borderRadius: 11,
        boxShadow: "var(--kc-shadow-btn)",
        opacity: pending ? 0.7 : 1,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending ? "Publicando…" : "Publicar pregunta"}
    </button>
  );
}
