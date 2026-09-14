"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { editarCapacitacion } from "@/app/(app)/admin/acciones";
import type { Capacitacion } from "@/modules/capacitaciones/domain/capacitacion";
import { BotonEnviar, Campo, ErrorAccion, entrada } from "./campos";

/** Los acentos disponibles, del lenguaje visual del diseño. */
const ACENTOS = [
  { valor: "#32D66B", nombre: "Verde" },
  { valor: "#39B8B4", nombre: "Turquesa" },
  { valor: "#3E7FA6", nombre: "Azul" },
  { valor: "#8B7CF6", nombre: "Violeta" },
  { valor: "#F5B843", nombre: "Ámbar" },
  { valor: "#E8825E", nombre: "Naranja" },
];

/**
 * Editar los datos de una capacitación ya creada.
 *
 * FALTABA, y dejaba un flujo a medias: la acción `editarCapacitacion` existía
 * en el servidor desde el principio, pero ninguna pantalla la llamaba. Una vez
 * creada, no había forma de corregirle el título, ponerle instructor o
 * asignarle fecha; solo publicarla, archivarla o borrarla.
 *
 * Eso importa más desde que el catálogo se ordena por fecha de impartición: sin
 * esta pantalla, una capacitación sin fecha se quedaba al final de la lista
 * para siempre.
 *
 * Va plegado porque no es lo que se viene a hacer aquí —se viene a agregar
 * temas y subir videos—, pero está a un clic cuando hace falta.
 */
export function EditarCapacitacion({ cap }: { cap: Capacitacion }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function enviar(form: FormData) {
    setError(null);
    setGuardado(false);

    const res = await editarCapacitacion(cap.id, form);

    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar.");
      return;
    }

    setGuardado(true);
    router.refresh();
    setTimeout(() => setGuardado(false), 2500);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="kc-btn"
        style={{
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink-2)",
          fontSize: 11.5,
          fontWeight: 600,
          padding: "7px 12px",
          borderRadius: 9,
          cursor: "pointer",
        }}
      >
        Editar datos
        {!cap.impartidaEn && (
          <span style={{ color: "#B07C10", marginLeft: 6 }}>· falta la fecha</span>
        )}
      </button>
    );
  }

  /*
   * La fecha, en el formato que espera `<input type="date">`: aaaa-mm-dd.
   *
   * Se toman los componentes en hora de México, no los UTC: un `toISOString()`
   * sobre una fecha guardada a mediodía daría el día correcto casi siempre,
   * pero el borde de medianoche lo rompería, y aquí el día exacto es el dato.
   */
  const fechaValor = cap.impartidaEn
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(cap.impartidaEn))
    : "";

  return (
    <form action={enviar} className="kc-panel kc-rise" style={{ padding: "16px 17px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "var(--kc-ink)", margin: 0, flex: 1 }}>
          Datos de la capacitación
        </h3>
        {guardado && (
          <span style={{ fontSize: 11, color: "#178A49", fontWeight: 600 }}>Guardado</span>
        )}
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="kc-btn"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--kc-ink-3)",
            fontSize: 11.5,
            cursor: "pointer",
            padding: 4,
          }}
        >
          Cerrar
        </button>
      </div>

      <ErrorAccion mensaje={error} />

      <Campo etiqueta="Título">
        <input name="title" required defaultValue={cap.title} style={entrada} />
      </Campo>

      <Campo
        etiqueta="Cuándo se impartió"
        ayuda="Manda el orden del catálogo: lo más reciente primero."
      >
        <input name="impartidaEn" type="date" defaultValue={fechaValor} style={entrada} />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Impartió">
          <input
            name="instructor"
            defaultValue={cap.instructor ?? ""}
            placeholder="Nombre de quien la dio"
            style={entrada}
          />
        </Campo>
        <Campo etiqueta="Puesto" ayuda="Opcional">
          <input
            name="instructorRole"
            defaultValue={cap.instructorRole ?? ""}
            placeholder="Líder de modelado"
            style={entrada}
          />
        </Campo>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Categoría">
          <input name="category" defaultValue={cap.category ?? ""} style={entrada} />
        </Campo>
        <Campo etiqueta="Nivel">
          <select name="level" defaultValue={cap.level} style={entrada}>
            <option>Básico</option>
            <option>Intermedio</option>
            <option>Avanzado</option>
          </select>
        </Campo>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Duración" ayuda="Opcional, ej. 2 h 40 min">
          <input name="duration" defaultValue={cap.duration ?? ""} style={entrada} />
        </Campo>
        <Campo etiqueta="Software" ayuda="Opcional">
          <input name="software" defaultValue={cap.software ?? ""} style={entrada} />
        </Campo>
      </div>

      <Campo
        etiqueta="Resumen"
        ayuda="Opcional. Solo si sabes de qué va: mejor vacío que a medias."
      >
        <textarea
          name="summary"
          rows={3}
          defaultValue={cap.summary ?? ""}
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <Campo
        etiqueta="Objetivos"
        ayuda="Opcional, uno por línea. Salen como «Al terminar sabrás»."
      >
        <textarea
          name="objectives"
          rows={3}
          defaultValue={cap.objectives.join("\n")}
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Periodo" ayuda="Texto que se muestra">
          <input name="period" defaultValue={cap.period ?? ""} style={entrada} />
        </Campo>
        <Campo etiqueta="Color">
          <select name="accent" defaultValue={cap.accent} style={entrada}>
            {ACENTOS.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <BotonEnviar pendienteTexto="Guardando…">Guardar cambios</BotonEnviar>
    </form>
  );
}
