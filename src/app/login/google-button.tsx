"use client";

import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "./actions";

/** La G de Google, con sus cuatro colores oficiales. Del diseño. */
function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.3-4.9 3.3-8z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.9 0 5.3-1 7-2.6l-3.4-2.7a6.6 6.6 0 0 1-9.9-3.5H2.1v2.9A11 11 0 0 0 12 23z"
      />
      <path fill="#FBBC05" d="M5.7 14.2a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.7z" />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3 .5 4.1 1.6l3-3A11 11 0 0 0 2.1 7.1l3.6 2.9A6.6 6.6 0 0 1 12 5.4z"
      />
    </svg>
  );
}

const REPOSO = "0 1px 2px rgba(7,23,43,.05)";
const ELEVADO = "0 8px 22px rgba(50,214,107,.16)";

/**
 * El botón de entrada.
 *
 * `useFormStatus` da el estado de envío sin necesidad de `useState`: mientras
 * Google responde, el botón se deshabilita solo. Sin eso, un doble clic abre
 * dos veces el flujo de OAuth y el segundo llega con el estado ya consumido.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="kc-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 11,
        width: "100%",
        border: "1px solid var(--kc-line)",
        background: "#fff",
        borderRadius: 13,
        padding: 14,
        marginTop: 22,
        fontSize: 14,
        fontWeight: 600,
        color: "var(--kc-ink)",
        boxShadow: REPOSO,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (pending) return;
        e.currentTarget.style.borderColor = "var(--kc-green)";
        e.currentTarget.style.boxShadow = ELEVADO;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--kc-line)";
        e.currentTarget.style.boxShadow = REPOSO;
      }}
    >
      <GoogleMark />
      {pending ? "Conectando…" : "Continuar con Google"}
    </button>
  );
}

export function GoogleButton() {
  return (
    <form action={signInWithGoogle}>
      <SubmitButton />
    </form>
  );
}
