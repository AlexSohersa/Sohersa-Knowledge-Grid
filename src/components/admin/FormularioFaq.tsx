"use client";

import { useState } from "react";
import { crearFaq } from "@/app/(app)/admin/acciones";
import { BotonEnviar, Campo, ErrorAccion, TituloFormulario, entrada } from "./campos";

/** Crear una pregunta frecuente. */
export function FormularioFaq() {
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function enviar(form: FormData) {
    const res = await crearFaq(form);
    if (res.ok) {
      setError(null);
      setExito(true);
      // El aviso desaparece solo: dejarlo fijo haría dudar de si la siguiente
      // que se escriba también se guardó.
      setTimeout(() => setExito(false), 3000);
    } else {
      setExito(false);
      setError(res.error ?? "No se pudo crear.");
    }
  }

  return (
    <form
      action={enviar}
      className="kc-panel kc-rise kc-sticky"
      style={{ padding: "18px 19px" }}
    >
      <TituloFormulario ayuda="Es la respuesta oficial: se lee como doctrina, no como opinión.">
        Nueva pregunta frecuente
      </TituloFormulario>

      <ErrorAccion mensaje={error} />

      {exito && (
        <p
          role="status"
          style={{
            fontSize: 11.5,
            color: "var(--kc-cap-ink)",
            margin: "0 0 10px",
            padding: "8px 11px",
            background: "var(--kc-cap-soft)",
            borderRadius: 9,
          }}
        >
          Publicada. Ya está en la sección de FAQ.
        </p>
      )}

      <Campo etiqueta="Categoría">
        <input name="category" required placeholder="Revit" style={entrada} />
      </Campo>

      <Campo etiqueta="Pregunta">
        <input
          name="question"
          required
          placeholder="¿Cómo cambio una revisión que ya fue emitida?"
          style={entrada}
        />
      </Campo>

      <Campo etiqueta="Respuesta">
        <textarea
          name="answer"
          required
          rows={4}
          placeholder="Una revisión emitida se bloquea a propósito para conservar el historial…"
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <Campo etiqueta="Pasos" ayuda="Uno por línea. Opcional, para procedimientos.">
        <textarea
          name="steps"
          rows={3}
          placeholder={"Abre el juego de planos\nCrea una revisión nueva\nVuelve a emitir"}
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <Campo
        etiqueta="Documento relacionado"
        ayuda="Código del cronograma, ej. 4.1. Opcional."
      >
        <input name="resourceCode" placeholder="4.1" style={entrada} />
      </Campo>

      <BotonEnviar pendienteTexto="Publicando…">Publicar pregunta</BotonEnviar>
    </form>
  );
}
