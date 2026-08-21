"use client";

import { useState, useTransition } from "react";
import { darDeBajaHerramienta } from "@/app/(app)/admin/acciones";

/**
 * Dar de baja una herramienta.
 *
 * No la borra: puede estar referenciada desde una FAQ o una capacitación, y
 * además saber qué se dejó de usar es información útil por sí misma. Queda
 * marcada como descontinuada.
 */
export function DarDeBaja({ herramientaId }: { herramientaId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendiente}
      title="Marcar como descontinuada. No se borra."
      onClick={() => {
        if (!confirmando) {
          setConfirmando(true);
          setTimeout(() => setConfirmando(false), 4000);
          return;
        }
        iniciar(async () => {
          await darDeBajaHerramienta(herramientaId);
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
      {confirmando ? "¿Seguro?" : "Dar de baja"}
    </button>
  );
}
