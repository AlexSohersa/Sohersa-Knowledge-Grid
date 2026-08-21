"use client";

import { useState, useTransition } from "react";
import { promoverAFaq } from "@/app/(app)/comunidad/acciones";

/**
 * Promover una pregunta resuelta a pregunta frecuente.
 *
 * Es el puente entre conversación y doctrina: cuando algo se pregunta muchas
 * veces y ya tiene solución validada, deja de ser una charla y pasa a ser la
 * respuesta oficial de la empresa.
 *
 * Solo lo ve administración —la página decide si pintarlo—, y el caso de uso lo
 * vuelve a comprobar en el servidor: esconder un botón no es un permiso.
 */
export function BotonPromoverFaq({ preguntaId }: { preguntaId: string }) {
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function promover() {
    setError(null);
    iniciar(async () => {
      const res = await promoverAFaq(preguntaId);
      if (res.ok) setHecho(true);
      else setError(res.error ?? "No se pudo promover a FAQ.");
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={promover}
        disabled={pendiente || hecho}
        title="Convertir esta solución en pregunta frecuente"
        className="kc-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          border: `1px solid ${hecho ? "rgba(50,214,107,.5)" : "rgba(245,184,67,.5)"}`,
          background: hecho ? "var(--kc-cap-soft)" : "var(--kc-faq-soft)",
          color: hecho ? "var(--kc-cap-ink)" : "var(--kc-faq-ink)",
          fontSize: 11.5,
          fontWeight: 600,
          padding: "8px 13px",
          borderRadius: 10,
          whiteSpace: "nowrap",
        }}
      >
        {hecho ? "Ya está en FAQ" : pendiente ? "Promoviendo…" : "Promover a FAQ"}
      </button>

      {error && (
        <p role="alert" style={{ fontSize: 11, color: "#C23840", margin: "6px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}
