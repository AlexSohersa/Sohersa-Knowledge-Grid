"use client";

import { useFormStatus } from "react-dom";

/**
 * Los campos de los formularios de Administración.
 *
 * Se agrupan aquí porque las seis pantallas de administración usan exactamente
 * la misma caja, la misma etiqueta y el mismo texto de ayuda. Repetir los
 * estilos en cada formulario acabaría con seis variantes ligeramente distintas.
 */

export const entrada: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--kc-line)",
  borderRadius: 10,
  padding: "9px 12px",
  fontFamily: "var(--kc-font)",
  fontSize: 12.5,
  color: "var(--kc-ink)",
  outline: "none",
  background: "#fff",
};

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--kc-ink)",
          marginBottom: ayuda ? 2 : 6,
        }}
      >
        {etiqueta}
      </label>
      {ayuda && (
        <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: "0 0 6px", lineHeight: 1.45 }}>
          {ayuda}
        </p>
      )}
      {children}
    </div>
  );
}

/** El botón de envío, que se deshabilita solo mientras el servidor responde. */
export function BotonEnviar({
  children,
  pendienteTexto,
}: {
  children: React.ReactNode;
  pendienteTexto?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="kc-btn"
      style={{
        width: "100%",
        border: "none",
        background: "var(--kc-green-solid)",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 600,
        padding: "11px 16px",
        borderRadius: 10,
        boxShadow: "var(--kc-shadow-btn)",
        opacity: pending ? 0.7 : 1,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending ? (pendienteTexto ?? "Guardando…") : children}
    </button>
  );
}

/** El encabezado de un formulario en tarjeta. */
export function TituloFormulario({
  children,
  ayuda,
}: {
  children: React.ReactNode;
  ayuda?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: "var(--kc-ink)",
          margin: 0,
          letterSpacing: "-.016em",
        }}
      >
        {children}
      </h2>
      {ayuda && (
        <p style={{ fontSize: 11, color: "var(--kc-ink-3)", margin: "4px 0 0", lineHeight: 1.5 }}>
          {ayuda}
        </p>
      )}
    </div>
  );
}

/** Mensaje de error de una acción. */
export function ErrorAccion({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p
      role="alert"
      style={{
        fontSize: 11.5,
        color: "#C23840",
        margin: "0 0 10px",
        padding: "8px 11px",
        background: "#FCE9EA",
        borderRadius: 9,
        lineHeight: 1.5,
      }}
    >
      {mensaje}
    </p>
  );
}
