"use client";

import { useState, useTransition } from "react";
import { asignarRuta, desasignarRuta } from "@/app/(app)/admin/acciones";
import { colorAvatar, iniciales } from "@/modules/shared/domain/conocimiento";
import { ErrorAccion, TituloFormulario, entrada } from "./campos";

/**
 * A quién está asignada esta ruta.
 *
 * Se asigna por CORREO y no eligiendo de una lista de personas: el equipo lo
 * mantiene Digital Core y aquí solo se leería, pero además el correo es la
 * llave real que une todas las herramientas. Escribirlo evita depender de que
 * el espejo esté al día.
 */
export function AsignarRuta({
  rutaId,
  asignados,
}: {
  rutaId: string;
  asignados: string[];
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function asignar() {
    const limpio = email.trim();
    if (!limpio) return;
    setError(null);

    iniciar(async () => {
      const res = await asignarRuta(rutaId, limpio);
      if (res.ok) setEmail("");
      else setError(res.error ?? "No se pudo asignar.");
    });
  }

  return (
    <div className="kc-panel kc-rise kc-sticky" style={{ padding: "18px 19px" }}>
      <TituloFormulario ayuda="Quien tenga esta ruta la verá en 'Mi ruta', con sus etapas.">
        Asignada a
      </TituloFormulario>

      <ErrorAccion mensaje={error} />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") asignar();
          }}
          type="email"
          placeholder="nombre@gruposohersa.com"
          style={{ ...entrada, fontSize: 11.5, padding: "9px 11px" }}
        />
        <button
          type="button"
          onClick={asignar}
          disabled={pendiente || !email.trim()}
          className="kc-btn"
          style={{
            border: "none",
            background: "var(--kc-green-solid)",
            color: "#fff",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "9px 14px",
            borderRadius: 9,
            flexShrink: 0,
            opacity: email.trim() ? 1 : 0.5,
          }}
        >
          Asignar
        </button>
      </div>

      {asignados.length === 0 ? (
        <p style={{ fontSize: 11.5, color: "var(--kc-ink-4)", margin: 0, lineHeight: 1.55 }}>
          Todavía no está asignada a nadie. Mientras tanto, nadie la ve.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {asignados.map((correo) => (
            <div
              key={correo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "7px 9px",
                border: "1px solid var(--kc-line)",
                borderRadius: 9,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: colorAvatar(correo),
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {iniciales(correo.split("@")[0].replace(/[._]/g, " "))}
              </span>
              <span
                className="kc-clamp-1"
                style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: "var(--kc-ink-2)" }}
              >
                {correo}
              </span>
              <BotonQuitar rutaId={rutaId} email={correo} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BotonQuitar({ rutaId, email }: { rutaId: string; email: string }) {
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
          await desasignarRuta(rutaId, email);
        });
      }}
      className="kc-btn"
      style={{
        border: "none",
        background: "transparent",
        color: confirmando ? "#C23840" : "var(--kc-ink-4)",
        fontSize: 10.5,
        fontWeight: 600,
        padding: "3px 6px",
        borderRadius: 7,
        flexShrink: 0,
      }}
    >
      {confirmando ? "¿Seguro?" : "Quitar"}
    </button>
  );
}
