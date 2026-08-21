"use client";

import { useState, useTransition } from "react";
import { alternarGuardado } from "@/app/(app)/acciones-personales";
import type { KindId } from "@/modules/shared/domain/conocimiento";

/**
 * El botón de guardar (el marcador).
 *
 * Actualiza el estado ANTES de que responda el servidor: guardar algo es una
 * acción que casi nunca falla y esperar medio segundo a que el icono se rellene
 * hace que la interfaz se sienta lenta. Si la acción falla, se revierte y se
 * dice por qué.
 */
export function BotonGuardar({
  kind,
  targetId,
  title,
  guardadoInicial,
  compacto = false,
}: {
  kind: KindId;
  targetId: string;
  title: string;
  guardadoInicial: boolean;
  compacto?: boolean;
}) {
  const [guardado, setGuardado] = useState(guardadoInicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function alternar() {
    const previo = guardado;
    setGuardado(!previo);
    setError(null);

    iniciar(async () => {
      try {
        const res = await alternarGuardado(kind, targetId, title);
        setGuardado(res.guardado);
      } catch {
        // Se vuelve al estado real: mostrar un marcador relleno que no se
        // guardó sería mentir sobre lo que hay en la lista.
        setGuardado(previo);
        setError("No se pudo guardar. Vuelve a intentarlo.");
      }
    });
  }

  const tamano = compacto ? 30 : 34;

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pendiente}
      title={error ?? (guardado ? "Quitar de guardados" : "Guardar")}
      aria-pressed={guardado}
      className="kc-btn"
      style={{
        width: tamano,
        height: tamano,
        borderRadius: 10,
        border: `1px solid ${guardado ? "rgba(245,184,67,.55)" : "var(--kc-line)"}`,
        background: guardado ? "#FDF3DC" : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: guardado ? "var(--kc-faq-ink)" : "var(--kc-ink-2)",
        flexShrink: 0,
      }}
    >
      {/* El marcador relleno es la señal de "ya está guardado": el mismo icono
          con y sin relleno se lee de un vistazo, sin leer texto. */}
      <svg
        width={compacto ? 13 : 15}
        height={compacto ? 13 : 15}
        viewBox="0 0 24 24"
        fill={guardado ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span className="kc-sr">
        {guardado ? "Quitar de guardados" : "Guardar para después"}
      </span>
    </button>
  );
}

/** Aviso de error accesible, cuando el botón compacto no puede mostrar el suyo. */
export function ErrorGuardado({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: "6px 0 0" }}>
      {mensaje}
    </p>
  );
}
