"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Qué se ve si el historial falla.
 *
 * Sin este archivo, un error aquí sube hasta la raíz y Next muestra la pantalla
 * genérica de «Application error» con un `digest` y nada más: ni el visitante
 * entiende qué pasó ni queda rastro útil en los registros. Con él, la sección
 * cae sola —el resto de la aplicación sigue en pie— y el motivo se registra
 * junto a su `digest`, que es lo que permite emparejarlo con lo que ve la
 * persona que reporta el fallo.
 */
export default function ErrorHistorial({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`[historial] ${error.digest ?? "sin digest"}: ${error.message}`, error.stack);
  }, [error]);

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <div className="kc-panel" style={{ padding: "34px 28px", textAlign: "center" }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--kc-ink)", margin: "0 0 8px" }}>
          No se pudo cargar el historial
        </h1>
        <p style={{ fontSize: 13, color: "var(--kc-ink-3)", margin: "0 0 16px", lineHeight: 1.6 }}>
          El resto del Centro sigue funcionando.
        </p>

        {/*
          EL MOTIVO, A LA VISTA.
          Next oculta el mensaje real en producción —solo entrega un `digest`—
          para no filtrar detalles del servidor al público. Aquí no hay público:
          esto solo lo ve gente de la empresa con sesión iniciada, y un código
          de nueve cifras no le sirve a nadie para arreglar nada. Mostrarlo
          convierte «avisa al equipo» en «copia esto y pégalo».
        */}
        <pre
          style={{
            fontSize: 11.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "var(--kc-ink-2)",
            background: "var(--kc-bg)",
            border: "1px solid var(--kc-line)",
            borderRadius: 9,
            padding: "11px 13px",
            margin: "0 0 20px",
            textAlign: "left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {error.message || "(sin mensaje)"}
          {error.digest ? `

digest: ${error.digest}` : ""}
        </pre>

        <div style={{ display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            className="kc-btn"
            style={{
              border: "none",
              background: "var(--kc-green-solid)",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
              padding: "10px 17px",
              borderRadius: 10,
              boxShadow: "var(--kc-shadow-btn)",
            }}
          >
            Reintentar
          </button>

          <Link
            href="/"
            className="kc-btn"
            style={{
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink-2)",
              fontSize: 12.5,
              fontWeight: 600,
              padding: "10px 17px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Ir a Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
