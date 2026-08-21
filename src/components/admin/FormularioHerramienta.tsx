"use client";

import { useState } from "react";
import { crearHerramienta } from "@/app/(app)/admin/acciones";
import {
  ESTADOS_ADOPCION,
  etiquetaAdopcion,
  explicacionAdopcion,
  type EstadoAdopcion,
} from "@/modules/herramientas/domain/herramienta";
import { BotonEnviar, Campo, ErrorAccion, TituloFormulario, entrada } from "./campos";

const ACENTOS = [
  { valor: "#32D66B", nombre: "Verde" },
  { valor: "#39B8B4", nombre: "Turquesa" },
  { valor: "#3E7FA6", nombre: "Azul" },
  { valor: "#8B7CF6", nombre: "Violeta" },
  { valor: "#F5B843", nombre: "Ámbar" },
  { valor: "#E8825E", nombre: "Naranja" },
];

/** Registrar una herramienta en el catálogo. */
export function FormularioHerramienta() {
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [estado, setEstado] = useState<EstadoAdopcion>("DISPONIBLE");

  async function enviar(form: FormData) {
    const res = await crearHerramienta(form);
    if (res.ok) {
      setError(null);
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } else {
      setExito(false);
      setError(res.error ?? "No se pudo registrar.");
    }
  }

  return (
    <form
      action={enviar}
      className="kc-panel kc-rise kc-sticky"
      style={{ padding: "18px 19px" }}
    >
      <TituloFormulario ayuda="El estado de adopción dice si ya se puede usar en un entregable.">
        Nueva herramienta
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
          Registrada. Ya está en el catálogo.
        </p>
      )}

      <Campo etiqueta="Nombre">
        <input name="name" required placeholder="Autodesk Revit" style={entrada} />
      </Campo>

      <Campo etiqueta="Descripción">
        <textarea
          name="description"
          rows={3}
          placeholder="Modelado y documentación BIM. Herramienta principal de producción."
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Clase">
          <select name="kind" defaultValue="Software" style={entrada}>
            <option>Software</option>
            <option>Plataforma</option>
            <option>Automatización</option>
            <option>Interno</option>
          </select>
        </Campo>
        <Campo etiqueta="Versión">
          <input name="version" placeholder="2026" style={entrada} />
        </Campo>
      </div>

      <Campo etiqueta="Licenciamiento">
        <input name="license" placeholder="Licencia por usuario" style={entrada} />
      </Campo>

      <Campo etiqueta="Disciplinas">
        <input name="discipline" placeholder="Modelado · Documentación" style={entrada} />
      </Campo>

      <Campo etiqueta="Estado de adopción">
        <select
          name="status"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoAdopcion)}
          style={entrada}
        >
          {ESTADOS_ADOPCION.map((s) => (
            <option key={s} value={s}>
              {etiquetaAdopcion(s)}
            </option>
          ))}
        </select>
        {/* Qué significa el estado elegido: la etiqueta sola se presta a
            interpretaciones distintas según quién la lea. */}
        <p
          style={{
            fontSize: 10.5,
            color: "var(--kc-ink-3)",
            margin: "6px 0 0",
            lineHeight: 1.5,
          }}
        >
          {explicacionAdopcion(estado)}
        </p>
      </Campo>

      <Campo etiqueta="Color">
        <select name="accent" defaultValue="#32D66B" style={entrada}>
          {ACENTOS.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <BotonEnviar pendienteTexto="Registrando…">Registrar herramienta</BotonEnviar>
    </form>
  );
}
