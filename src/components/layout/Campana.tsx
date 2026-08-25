"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aspectoDe,
  haceCuanto,
  type Notificacion,
} from "@/modules/notificaciones/domain/notificacion";
import { marcarLeidos, marcarLeido } from "@/app/(app)/acciones-avisos";

/**
 * La campana de avisos.
 *
 * Toma de Deal Engine el gesto —campana con contador, panel desplegable,
 * marcar leído al abrir— pero con una diferencia de fondo: allá lo leído vive
 * en `localStorage` del navegador, y aquí en la base. Tiene que ser así porque
 * estos avisos son de cosas que pasaron mientras la persona no miraba
 * —respondieron su pregunta, hay una propuesta esperando— y guardarlos en el
 * navegador los perdería al cambiar de equipo.
 */
export function Campana({
  avisos,
  sinLeer,
}: {
  avisos: Notificacion[];
  sinLeer: number;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cuenta, setCuenta] = useState(sinLeer);
  const [, iniciar] = useTransition();
  const caja = useRef<HTMLDivElement>(null);

  /* El servidor manda la verdad en cada navegación. */
  useEffect(() => setCuenta(sinLeer), [sinLeer]);

  /*
   * Cerrar al pulsar fuera o con Escape.
   *
   * Sin esto el panel se queda abierto tapando la pantalla, y el único modo de
   * cerrarlo sería volver a dar en la campana —que es justo lo que nadie
   * intenta—.
   */
  useEffect(() => {
    if (!abierto) return;

    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  function abrir() {
    const abriendo = !abierto;
    setAbierto(abriendo);

    // Abrir el panel es haberlos visto. Se baja el contador de inmediato y se
    // registra por detrás: esperar al servidor dejaría el número parpadeando.
    if (abriendo && cuenta > 0) {
      setCuenta(0);
      iniciar(() => {
        void marcarLeidos();
      });
    }
  }

  function ir(a: Notificacion) {
    setAbierto(false);
    iniciar(() => {
      void marcarLeido(a.id);
    });
    if (a.href) router.push(a.href);
  }

  return (
    <div ref={caja} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={abrir}
        aria-expanded={abierto}
        aria-label={cuenta > 0 ? `Avisos: ${cuenta} sin leer` : "Avisos"}
        title="Avisos"
        className="kc-btn"
        style={{
          position: "relative",
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconoCampana />

        {cuenta > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              borderRadius: 99,
              background: "var(--kc-green-solid)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {cuenta > 9 ? "9+" : cuenta}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className="kc-pop"
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            width: 330,
            maxHeight: 420,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid var(--kc-line)",
            borderRadius: 13,
            boxShadow: "var(--kc-shadow-lift)",
            zIndex: 60,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".1em",
              color: "var(--kc-ink-4)",
              padding: "13px 15px 9px",
              borderBottom: "1px solid var(--kc-line)",
            }}
          >
            AVISOS
          </div>

          {avisos.length === 0 ? (
            <p
              style={{
                fontSize: 12.5,
                color: "var(--kc-ink-4)",
                margin: 0,
                padding: "24px 18px",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              Nada nuevo por ahora.
            </p>
          ) : (
            avisos.map((a) => {
              const asp = aspectoDe(a.kind);
              const nuevo = a.readAt === null;

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => ir(a)}
                  className="kc-row-h"
                  style={{
                    display: "flex",
                    gap: 10,
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid var(--kc-line)",
                    background: nuevo ? "var(--kc-surface-2)" : "transparent",
                    padding: "11px 15px",
                    textAlign: "left",
                    cursor: a.href ? "pointer" : "default",
                    fontFamily: "var(--kc-font)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: nuevo ? asp.color : "var(--kc-line-2)",
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12.5,
                        fontWeight: nuevo ? 600 : 500,
                        color: "var(--kc-ink)",
                        lineHeight: 1.35,
                      }}
                    >
                      {a.title}
                    </span>

                    {a.body && (
                      <span
                        className="kc-clamp-2"
                        style={{ display: "block", fontSize: 11.5, color: "var(--kc-ink-3)", marginTop: 2, lineHeight: 1.4 }}
                      >
                        {a.body}
                      </span>
                    )}

                    <span style={{ display: "block", fontSize: 10.5, color: "var(--kc-ink-4)", marginTop: 3 }}>
                      {haceCuanto(new Date(a.createdAt))}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** La campana. No está en el juego de iconos, así que va aquí. */
function IconoCampana() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
