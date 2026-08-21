"use client";

import { useState, useTransition } from "react";
import { sincronizarBiblioteca } from "@/app/(app)/biblioteca/acciones";

/**
 * El botón de sincronizar el cronograma.
 *
 * Muestra el resultado en el propio botón —"12 nuevos, 4 actualizados"— en vez
 * de un aviso aparte: quien sincroniza quiere saber si hizo algo, y un mensaje
 * pegado al botón se lee sin buscar dónde apareció.
 *
 * Los errores se muestran completos porque casi siempre son accionables:
 * "falta el permiso de Sheets" le dice a la persona exactamente qué hacer.
 */
export function BotonSincronizar() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function sincronizar() {
    setMensaje(null);
    setError(null);

    iniciar(async () => {
      try {
        const res = await sincronizarBiblioteca();

        if (!res.ok) {
          setError(res.error ?? "No se pudo sincronizar.");
          return;
        }

        const partes: string[] = [];
        if (res.created) partes.push(`${res.created} nuevos`);
        if (res.updated) partes.push(`${res.updated} actualizados`);
        setMensaje(partes.length > 0 ? partes.join(", ") : "Ya estaba al día");

        // El aviso se retira solo: dejarlo fijo haría dudar de si corresponde a
        // esta sincronización o a la anterior.
        setTimeout(() => setMensaje(null), 5000);
      } catch {
        setError("No se pudo sincronizar. Vuelve a intentarlo.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
      <button
        type="button"
        onClick={sincronizar}
        disabled={pendiente}
        title="Traer el cronograma de Google al día"
        className="kc-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink)",
          fontSize: 12,
          fontWeight: 600,
          padding: "8px 13px",
          borderRadius: 10,
          whiteSpace: "nowrap",
          cursor: pendiente ? "wait" : "pointer",
          opacity: pendiente ? 0.75 : 1,
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          style={
            pendiente
              ? { animation: "kc-orbit 1s linear infinite", transformOrigin: "center" }
              : undefined
          }
        >
          <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
        </svg>
        {pendiente ? "Sincronizando…" : "Sincronizar"}
      </button>

      {mensaje && (
        <span role="status" style={{ fontSize: 10.5, color: "var(--kc-green-ink)" }}>
          {mensaje}
        </span>
      )}
      {error && (
        <span
          role="alert"
          style={{ fontSize: 10.5, color: "#C23840", maxWidth: 280, textAlign: "right" }}
        >
          {error}
        </span>
      )}
    </span>
  );
}
