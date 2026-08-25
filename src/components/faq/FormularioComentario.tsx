"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { comentarFaq } from "@/app/(app)/faq/acciones";

/**
 * El formulario de comentarios al área de Estandarización y Calidad.
 *
 * Sigue el borrador campo por campo: NOMBRE y ÁREA / DEPARTAMENTO arriba, en
 * dos columnas, y COMENTARIO O INQUIETUD debajo.
 *
 * La diferencia con el borrador es que los dos primeros vienen RELLENADOS desde
 * el padrón: la sesión ya sabe quién eres y en qué área estás, así que pedirlo
 * en blanco sería hacer teclear algo que la aplicación conoce mejor —y que
 * mal escrito ensucia la bandeja del área—. Se dejan editables porque hay quien
 * trabaja para dos áreas y quiere decir desde cuál escribe.
 *
 * No es una pregunta a la comunidad —que se responde en público— sino un
 * mensaje con destinatario, así que no tiene respuestas ni votos.
 */
export function FormularioComentario({
  faqId,
  sobre,
  autor,
  areas,
}: {
  faqId: string | null;
  /** La ficha desde la que se llegó, para decirlo en pantalla. */
  sobre: { code: string | null; question: string } | null;
  autor: { nombre: string; area: string | null };
  /** Las áreas que existen en el padrón, para poder elegir otra. */
  areas: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [pendiente, iniciar] = useTransition();

  /*
   * LO ESCRITO NO SE PIERDE.
   *
   * React vacía el `<form>` cuando la acción termina, y con campos sin valor
   * propio eso borraba el comentario justo al fallar la validación: se veía el
   * error en rojo y el cuadro en blanco, con todo por reescribir.
   */
  const [valores, setValores] = useState<Record<string, string>>({
    nombre: autor.nombre,
    area: autor.area ?? "",
    message: "",
  });

  function cambiar(campo: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValores((v) => ({ ...v, [campo]: e.target.value }));
  }

  function enviar(form: FormData) {
    setError(null);
    setErrorCampo(null);

    const enviado: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") enviado[k] = v;
    }
    setValores((prev) => ({ ...prev, ...enviado }));

    iniciar(async () => {
      const res = await comentarFaq(form);
      if (res.ok) {
        setListo(true);
        return;
      }
      setErrorCampo(res.errores?.message ?? null);
      setError(res.error ?? null);
    });
  }

  if (listo) {
    return (
      <div className="kc-panel kc-pop" style={{ padding: "34px 28px", textAlign: "center" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--kc-ink)", margin: "0 0 7px" }}>
          Gracias, ya lo tienen
        </h2>
        <p style={{ fontSize: 13, color: "var(--kc-ink-3)", margin: "0 0 20px", lineHeight: 1.6 }}>
          Los comentarios alimentan la actualización de la base de datos.
        </p>
        <button
          type="button"
          onClick={() => router.push(sobre && faqId ? `/faq/${sobre.code ?? faqId}` : "/faq")}
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
          {sobre ? "Volver a la ficha" : "Volver a las fichas"}
        </button>
      </div>
    );
  }

  return (
    <form action={enviar} className="kc-panel" style={{ padding: "22px 24px" }}>
      {faqId && <input type="hidden" name="faqId" value={faqId} />}

      {sobre && (
        <div
          style={{
            fontSize: 12,
            color: "var(--kc-ink-3)",
            background: "var(--kc-bg)",
            border: "1px solid var(--kc-line)",
            borderRadius: 9,
            padding: "9px 12px",
            marginBottom: 18,
          }}
        >
          Sobre{" "}
          {sobre.code && (
            <strong style={{ color: "var(--kc-faq-ink)", fontVariantNumeric: "tabular-nums" }}>
              {sobre.code}
            </strong>
          )}{" "}
          {sobre.question}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Campo etiqueta="NOMBRE">
          <input
            name="nombre"
            required
            maxLength={120}
            value={valores.nombre ?? ""}
            onChange={cambiar("nombre")}
            style={entrada}
          />
        </Campo>

        <Campo etiqueta="ÁREA / DEPARTAMENTO">
          {/*
            Un desplegable con las áreas del padrón, no un campo libre: así la
            bandeja del área agrupa bien y nadie escribe «Transformación
            Digital» de cuatro maneras distintas.
          */}
          <select name="area" value={valores.area ?? ""} onChange={cambiar("area")} style={entrada}>
            <option value="">Sin especificar</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo etiqueta="COMENTARIO O INQUIETUD" error={errorCampo}>
        <textarea
          name="message"
          required
          rows={6}
          maxLength={2000}
          value={valores.message ?? ""}
          onChange={cambiar("message")}
          placeholder="Un error en una ficha, algo que falta, una sugerencia…"
          style={{ ...entrada, resize: "vertical" }}
        />
      </Campo>

      {error && (
        <p role="alert" style={{ fontSize: 12, color: "#C23840", margin: "12px 0 0" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
        <button
          type="submit"
          disabled={pendiente}
          className="kc-btn"
          style={{
            border: "none",
            background: "var(--kc-green-solid)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            padding: "11px 20px",
            borderRadius: 11,
            boxShadow: "var(--kc-shadow-btn)",
          }}
        >
          {pendiente ? "Enviando…" : "Enviar comentario"}
        </button>

        <span style={{ fontSize: 11.5, color: "var(--kc-ink-4)" }}>
          Los comentarios alimentan la actualización de la base de datos.
        </span>
      </div>
    </form>
  );
}

const entrada: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  fontFamily: "var(--kc-font)",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink)",
  outline: "none",
};

function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: ".11em",
          color: "var(--kc-ink-4)",
          marginBottom: 7,
        }}
      >
        {etiqueta}
      </span>

      {children}

      {error && (
        <span role="alert" style={{ display: "block", fontSize: 11, color: "#C23840", marginTop: 5 }}>
          {error}
        </span>
      )}
    </label>
  );
}
