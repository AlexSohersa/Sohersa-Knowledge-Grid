"use client";

import { useState, useTransition } from "react";
import { Pill } from "@/components/ui/Pill";
import { colorAvatar, iniciales } from "@/modules/shared/domain/conocimiento";
import { haceCuanto } from "@/modules/shared/domain/formato";
import type { Pregunta, Respuesta } from "@/modules/comunidad/domain/pregunta";
import {
  comentar,
  borrarRespuesta,
  validarSolucion,
  votarRespuesta,
} from "@/app/(app)/comunidad/acciones";

/**
 * El hilo de respuestas.
 *
 * Lo importante de esta pantalla es que las respuestas VALIDADAS van primero y
 * numeradas —"Solución 1", "Solución 2"—. Pueden convivir varias porque a
 * menudo hay más de un camino correcto, y esconder el segundo empobrece la
 * respuesta. El orden lo da la fecha de validación.
 */
export function HiloRespuestas({
  pregunta,
  yo,
  esAdmin,
}: {
  pregunta: Pregunta;
  yo: string;
  esAdmin: boolean;
}) {
  // Las respuestas llegan YA ordenadas del servidor (validadas primero); aquí
  // solo se numeran para etiquetarlas.
  let numeroSolucion = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {pregunta.respuestas.map((r) => {
        const validada = r.validatedAt !== null;
        if (validada) numeroSolucion += 1;

        return (
          <TarjetaRespuesta
            key={r.id}
            respuesta={r}
            numero={validada ? numeroSolucion : null}
            yo={yo}
            esAdmin={esAdmin}
          />
        );
      })}
    </div>
  );
}

function TarjetaRespuesta({
  respuesta,
  numero,
  yo,
  esAdmin,
}: {
  respuesta: Respuesta;
  numero: number | null;
  yo: string;
  esAdmin: boolean;
}) {
  const [votos, setVotos] = useState(respuesta.votos);
  const [votada, setVotada] = useState(respuesta.votadaPorMi);
  const [validada, setValidada] = useState(respuesta.validatedAt !== null);
  const [comentario, setComentario] = useState("");
  const [comentando, setComentando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const esMia = respuesta.email.toLowerCase() === yo.toLowerCase();
  const puedoVotar = !esMia;
  const puedoBorrar = esMia || esAdmin;

  function votar() {
    if (!puedoVotar) return;
    const previoVotada = votada;
    const previoVotos = votos;

    setVotada(!previoVotada);
    setVotos(previoVotos + (previoVotada ? -1 : 1));
    setError(null);

    iniciar(async () => {
      const res = await votarRespuesta(respuesta.id);
      if (res.ok && res.votos !== undefined) {
        setVotos(res.votos);
      } else {
        setVotada(previoVotada);
        setVotos(previoVotos);
        setError(res.error ?? "No se pudo registrar tu voto.");
      }
    });
  }

  function alternarValidacion() {
    const previo = validada;
    setValidada(!previo);
    setError(null);

    iniciar(async () => {
      const res = await validarSolucion(respuesta.id, !previo);
      if (!res.ok) {
        setValidada(previo);
        setError(res.error ?? "No se pudo cambiar la validación.");
      }
    });
  }

  function enviarComentario() {
    const texto = comentario.trim();
    if (!texto) return;

    iniciar(async () => {
      const res = await comentar(respuesta.id, texto);
      if (res.ok) {
        setComentario("");
        setComentando(false);
      } else {
        setError(res.error ?? "No se pudo publicar el comentario.");
      }
    });
  }

  function borrar() {
    iniciar(async () => {
      const res = await borrarRespuesta(respuesta.id);
      if (!res.ok) setError(res.error ?? "No se pudo borrar.");
    });
  }

  return (
    <article
      className="kc-panel"
      style={{
        padding: "16px 18px",
        // La solución validada se distingue con borde verde: es la señal de
        // "esto es lo correcto" y tiene que verse antes de leer nada.
        borderColor: validada ? "rgba(50,214,107,.45)" : "var(--kc-line)",
        borderLeft: validada ? "3px solid var(--kc-green)" : "1px solid var(--kc-line)",
        background: validada ? "#FBFEFC" : "#fff",
      }}
    >
      {validada && numero !== null && (
        <div style={{ marginBottom: 11 }}>
          <Pill soft="var(--kc-cap-soft)" ink="var(--kc-cap-ink)">
            <Check /> Solución {numero}
          </Pill>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Columna de voto: el número grande y el botón, como en un foro. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
            width: 40,
          }}
        >
          <button
            type="button"
            onClick={votar}
            disabled={!puedoVotar || pendiente}
            aria-pressed={votada}
            title={puedoVotar ? "Esta respuesta me sirvió" : "No puedes votar tu propia respuesta"}
            className="kc-btn"
            style={{
              width: 32,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${votada ? "rgba(50,214,107,.5)" : "var(--kc-line)"}`,
              background: votada ? "var(--kc-cap-soft)" : "#fff",
              color: votada ? "var(--kc-cap-ink)" : "var(--kc-ink-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: puedoVotar ? "pointer" : "not-allowed",
              opacity: puedoVotar ? 1 : 0.5,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 15 7-7 7 7" />
            </svg>
            <span className="kc-sr">Votar esta respuesta</span>
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kc-ink-2)" }}>{votos}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Autor */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: colorAvatar(respuesta.authorName),
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10.5,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {iniciales(respuesta.authorName)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--kc-ink)",
                }}
              >
                {respuesta.authorName}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
                {[respuesta.authorRole, haceCuanto(respuesta.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </div>

          <p
            style={{
              fontSize: 13,
              color: "var(--kc-ink-2)",
              margin: 0,
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
            }}
          >
            {respuesta.body}
          </p>

          {/* Comentarios sobre la respuesta: matices y agradecimientos. */}
          {respuesta.comentarios.length > 0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid #F1F5F9",
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              {respuesta.comentarios.map((c) => (
                <p
                  key={c.id}
                  style={{
                    fontSize: 11.5,
                    color: "var(--kc-ink-3)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: "var(--kc-ink-2)" }}>{c.authorName}</strong>: {c.body}{" "}
                  <span style={{ color: "var(--kc-ink-4)" }}>· {haceCuanto(c.createdAt)}</span>
                </p>
              ))}
            </div>
          )}

          {/* Acciones */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <BotonMenor onClick={() => setComentando((v) => !v)} disabled={pendiente}>
              Comentar
            </BotonMenor>

            {/* Validar solo lo ve administración: es lo que da autoridad a la
                marca de solución. */}
            {esAdmin && (
              <BotonMenor
                onClick={alternarValidacion}
                disabled={pendiente}
                activo={validada}
              >
                {validada ? "Quitar solución" : "Marcar como solución"}
              </BotonMenor>
            )}

            {puedoBorrar && (
              <BotonMenor onClick={borrar} disabled={pendiente} peligro>
                Borrar
              </BotonMenor>
            )}
          </div>

          {comentando && (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enviarComentario();
                }}
                placeholder="Añade un matiz o una corrección…"
                autoFocus
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "1px solid var(--kc-line)",
                  borderRadius: 9,
                  padding: "8px 11px",
                  fontFamily: "var(--kc-font)",
                  fontSize: 12,
                  color: "var(--kc-ink)",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={enviarComentario}
                disabled={pendiente || !comentario.trim()}
                className="kc-btn"
                style={{
                  border: "none",
                  background: "var(--kc-green-solid)",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 9,
                  opacity: comentario.trim() ? 1 : 0.5,
                }}
              >
                Enviar
              </button>
            </div>
          )}

          {error && (
            <p role="alert" style={{ fontSize: 11.5, color: "#C23840", margin: "9px 0 0" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function BotonMenor({
  children,
  onClick,
  disabled,
  activo,
  peligro,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  activo?: boolean;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="kc-btn"
      style={{
        border: `1px solid ${
          activo ? "rgba(50,214,107,.5)" : peligro ? "rgba(194,56,64,.3)" : "var(--kc-line)"
        }`,
        background: activo ? "var(--kc-cap-soft)" : "#fff",
        color: activo ? "var(--kc-cap-ink)" : peligro ? "#C23840" : "var(--kc-ink-2)",
        fontSize: 11,
        fontWeight: 600,
        padding: "6px 11px",
        borderRadius: 8,
      }}
    >
      {children}
    </button>
  );
}

function Check() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
