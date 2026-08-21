"use client";

import { useState, useTransition } from "react";
import { borrarFaq } from "@/app/(app)/admin/acciones";

/** Borrar una pregunta frecuente, con confirmación en el propio botón. */
export function BorrarFaq({ faqId }: { faqId: string }) {
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
          await borrarFaq(faqId);
        });
      }}
      className="kc-btn"
      style={{
        border: `1px solid ${confirmando ? "rgba(194,56,64,.45)" : "var(--kc-line)"}`,
        background: confirmando ? "#FCE9EA" : "#fff",
        color: confirmando ? "#C23840" : "var(--kc-ink-4)",
        fontSize: 10.5,
        fontWeight: 600,
        padding: "5px 10px",
        borderRadius: 8,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {confirmando ? "¿Seguro?" : "Borrar"}
    </button>
  );
}
