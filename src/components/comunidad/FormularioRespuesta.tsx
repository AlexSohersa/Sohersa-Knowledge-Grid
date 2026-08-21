"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { responder, type EstadoFormulario } from "@/app/(app)/comunidad/acciones";

const INICIAL: EstadoFormulario = { ok: false };

/**
 * El cuadro para responder.
 *
 * Usa `useActionState` para que la validación del servidor vuelva sin
 * JavaScript propio de por medio: el mismo texto de error que decidió el
 * dominio es el que se muestra, sin una segunda regla en el cliente que pueda
 * desviarse de la primera.
 */
export function FormularioRespuesta({ preguntaId }: { preguntaId: string }) {
  const responderAqui = responder.bind(null, preguntaId);
  const [estado, accion] = useActionState(responderAqui, INICIAL);
  const ref = useRef<HTMLFormElement>(null);

  // Al publicarse, se vacía el cuadro: dejar el texto haría dudar de si se
  // envió, y un segundo envío duplicaría la respuesta.
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado.ok]);

  return (
    <form ref={ref} action={accion} className="kc-panel" style={{ padding: "16px 18px" }}>
      <label
        htmlFor="respuesta-body"
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--kc-ink)",
          marginBottom: 9,
        }}
      >
        Tu respuesta
      </label>

      <textarea
        id="respuesta-body"
        name="body"
        rows={5}
        placeholder="Explica cómo se resuelve. Si hay pasos, enuméralos: alguien va a seguirlos tal cual."
        style={{
          width: "100%",
          border: "1px solid var(--kc-line)",
          borderRadius: 11,
          padding: "11px 13px",
          fontFamily: "var(--kc-font)",
          fontSize: 12.5,
          color: "var(--kc-ink)",
          lineHeight: 1.6,
          resize: "vertical",
          outline: "none",
        }}
      />

      {estado.error && (
        <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: "9px 0 0" }}>
          {estado.error}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 11 }}>
        <BotonPublicar />
      </div>
    </form>
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
        padding: "10px 18px",
        borderRadius: 10,
        boxShadow: "var(--kc-shadow-btn)",
        opacity: pending ? 0.7 : 1,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending ? "Publicando…" : "Publicar respuesta"}
    </button>
  );
}
