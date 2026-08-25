"use client";

import { useState, useTransition } from "react";
import { ordenarCapturasFaq } from "@/app/(app)/admin/acciones";

/**
 * Lleva las capturas del catálogo a la carpeta «FAQ Web».
 *
 * Es una operación de una sola vez: las 51 imágenes que se importaron viven
 * todavía en la carpeta de trabajo del área, y desde ahí pueden desaparecer sin
 * aviso. Las capturas que se suban desde ahora ya nacen en el sitio correcto,
 * así que este botón deja de hacer falta en cuanto se pulse una vez.
 */
export function OrdenarCapturas() {
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function ordenar() {
    setResultado(null);
    setError(null);

    iniciar(async () => {
      const r = await ordenarCapturasFaq();
      if (!r.ok) {
        setError(r.error ?? "No se pudieron ordenar las capturas.");
        return;
      }
      setResultado(
        `${r.copiadas} copiadas · ${r.yaEstaban} ya estaban en su sitio` +
          (r.fallaron ? ` · ${r.fallaron} fallaron` : ""),
      );
    });
  }

  return (
    <div
      className="kc-panel"
      style={{ padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--kc-ink)", margin: "0 0 3px" }}>
          Ordenar las capturas en Drive
        </p>
        <p style={{ fontSize: 11.5, color: "var(--kc-ink-4)", margin: 0, lineHeight: 1.5 }}>
          Copia las imágenes del catálogo a «FAQ Web», por categoría y subcategoría.
          Las originales se quedan donde están.
        </p>
      </div>

      <button
        type="button"
        onClick={ordenar}
        disabled={pendiente}
        className="kc-btn"
        style={{
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink-2)",
          fontSize: 11.5,
          fontWeight: 600,
          padding: "8px 14px",
          borderRadius: 9,
          flexShrink: 0,
        }}
      >
        {pendiente ? "Copiando…" : "Ordenar"}
      </button>

      {resultado && (
        <p style={{ fontSize: 11.5, color: "var(--kc-cap-ink)", margin: 0, width: "100%" }}>
          {resultado}
        </p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: 0, width: "100%" }}>
          {error}
        </p>
      )}
    </div>
  );
}
