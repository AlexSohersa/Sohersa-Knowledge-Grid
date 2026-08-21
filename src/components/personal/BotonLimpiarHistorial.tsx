"use client";

import { useState, useTransition } from "react";
import { limpiarHistorial } from "@/app/(app)/acciones-personales";

/**
 * Vaciar el historial.
 *
 * Pide confirmación en el propio botón —"¿Seguro?"— en vez de con un diálogo
 * del navegador: es una acción que no se puede deshacer, pero tampoco es grave
 * como para interrumpir con una ventana modal. Dos clics deliberados bastan.
 */
export function BotonLimpiarHistorial() {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function limpiar() {
    if (!confirmando) {
      setConfirmando(true);
      // Si no se confirma en unos segundos, vuelve a su estado normal: un botón
      // que se queda en "¿Seguro?" acaba pulsándose sin querer más tarde.
      setTimeout(() => setConfirmando(false), 4000);
      return;
    }

    iniciar(async () => {
      await limpiarHistorial();
      setConfirmando(false);
    });
  }

  return (
    <button
      type="button"
      onClick={limpiar}
      disabled={pendiente}
      className="kc-btn"
      style={{
        border: `1px solid ${confirmando ? "rgba(194,56,64,.4)" : "var(--kc-line)"}`,
        background: confirmando ? "#FCE9EA" : "#fff",
        color: confirmando ? "#C23840" : "var(--kc-ink-2)",
        fontSize: 11.5,
        fontWeight: 600,
        padding: "8px 13px",
        borderRadius: 10,
        whiteSpace: "nowrap",
      }}
    >
      {pendiente ? "Vaciando…" : confirmando ? "¿Seguro? Pulsa otra vez" : "Vaciar historial"}
    </button>
  );
}
