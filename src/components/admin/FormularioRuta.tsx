"use client";

import { useState } from "react";
import { crearRuta } from "@/app/(app)/admin/acciones";
import { BotonEnviar, Campo, ErrorAccion, TituloFormulario, entrada } from "./campos";

/** Crear una ruta. Al guardarla se abre su editor, donde se arman las etapas. */
export function FormularioRuta() {
  const [error, setError] = useState<string | null>(null);

  async function enviar(form: FormData) {
    const res = await crearRuta(form);
    if (res && !res.ok) setError(res.error ?? "No se pudo crear la ruta.");
  }

  return (
    <form action={enviar} className="kc-panel kc-rise" style={{ padding: "18px 19px" }}>
      <TituloFormulario ayuda="Después le agregas etapas y se la asignas a quien le toca.">
        Nueva ruta
      </TituloFormulario>

      <ErrorAccion mensaje={error} />

      <Campo etiqueta="Nombre">
        <input name="name" required placeholder="Ruta BIM — Coordinación" style={entrada} />
      </Campo>

      <Campo etiqueta="Objetivo" ayuda="Para qué prepara esta ruta a quien la recorre.">
        <textarea
          name="objective"
          rows={3}
          placeholder="Preparación para tomar la coordinación de un proyecto completo."
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <BotonEnviar pendienteTexto="Creando…">Crear ruta</BotonEnviar>
    </form>
  );
}
