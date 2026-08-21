"use client";

import { useState, useTransition } from "react";
import {
  archivarCapacitacion,
  borrarCapacitacion,
  publicarCapacitacion,
} from "@/app/(app)/admin/acciones";

/**
 * Publicar, archivar o borrar una capacitación.
 *
 * Publicar solo se ofrece si ya hay temas: el caso de uso lo rechazaría de
 * todas formas, y deshabilitar el botón explica el porqué antes de que alguien
 * lo intente.
 */
export function AccionesCapacitacion({
  capId,
  estado,
  tieneTemas,
}: {
  capId: string;
  estado: string;
  tieneTemas: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function publicar() {
    setError(null);
    iniciar(async () => {
      const res = await publicarCapacitacion(capId);
      if (!res.ok) setError(res.error ?? "No se pudo publicar.");
    });
  }

  function archivar() {
    setError(null);
    iniciar(async () => {
      await archivarCapacitacion(capId);
    });
  }

  function borrar() {
    if (!confirmandoBorrado) {
      setConfirmandoBorrado(true);
      setTimeout(() => setConfirmandoBorrado(false), 4000);
      return;
    }
    iniciar(async () => {
      await borrarCapacitacion(capId);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {estado !== "PUBLICADA" && (
          <button
            type="button"
            onClick={publicar}
            disabled={pendiente || !tieneTemas}
            title={
              tieneTemas
                ? "Publicar para todo el equipo"
                : "Agrega al menos un tema antes de publicarla"
            }
            className="kc-btn"
            style={{
              border: "none",
              background: "var(--kc-green-solid)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "9px 15px",
              borderRadius: 10,
              boxShadow: "var(--kc-shadow-btn)",
              opacity: tieneTemas ? 1 : 0.5,
              cursor: tieneTemas ? "pointer" : "not-allowed",
            }}
          >
            Publicar
          </button>
        )}

        {estado === "PUBLICADA" && (
          <button
            type="button"
            onClick={archivar}
            disabled={pendiente}
            title="Retirarla de la biblioteca. El avance de la gente se conserva."
            className="kc-btn"
            style={{
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink-2)",
              fontSize: 12,
              fontWeight: 600,
              padding: "9px 14px",
              borderRadius: 10,
            }}
          >
            Archivar
          </button>
        )}

        <button
          type="button"
          onClick={borrar}
          disabled={pendiente}
          className="kc-btn"
          style={{
            border: `1px solid ${confirmandoBorrado ? "rgba(194,56,64,.45)" : "var(--kc-line)"}`,
            background: confirmandoBorrado ? "#FCE9EA" : "#fff",
            color: confirmandoBorrado ? "#C23840" : "var(--kc-ink-3)",
            fontSize: 12,
            fontWeight: 600,
            padding: "9px 14px",
            borderRadius: 10,
            whiteSpace: "nowrap",
          }}
        >
          {confirmandoBorrado ? "¿Seguro? Pulsa otra vez" : "Borrar"}
        </button>
      </div>

      {!tieneTemas && estado !== "PUBLICADA" && (
        <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: 0, maxWidth: 240 }}>
          Agrega al menos un tema para poder publicarla.
        </p>
      )}

      {error && (
        <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
