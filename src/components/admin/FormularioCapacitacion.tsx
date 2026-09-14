"use client";

import { useState } from "react";
import { crearCapacitacion } from "@/app/(app)/admin/acciones";
import { BotonEnviar, Campo, ErrorAccion, TituloFormulario, entrada } from "./campos";

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
 * Crear una capacitación.
 *
 * Nace en borrador: publicar es un paso aparte, y una capacitación recién
 * creada todavía no tiene temas. Al guardarla, la acción lleva a su pantalla de
 * edición, que es donde se agregan.
 */
export function FormularioCapacitacion() {
  const [error, setError] = useState<string | null>(null);

  async function enviar(form: FormData) {
    const res = await crearCapacitacion(form);
    // Si la acción redirige, esto no llega a ejecutarse. Solo se ve el error.
    if (res && !res.ok) setError(res.error ?? "No se pudo crear.");
  }

  return (
    <form action={enviar} className="kc-panel kc-rise" style={{ padding: "18px 19px" }}>
      <TituloFormulario ayuda="Se crea en borrador. Después agregas sus temas y la publicas.">
        Nueva capacitación
      </TituloFormulario>

      <ErrorAccion mensaje={error} />

      <Campo etiqueta="Título">
        <input name="title" required placeholder="Documentación y revisiones en Revit" style={entrada} />
      </Campo>

      {/*
        Resumen y objetivos son OPCIONALES, y conviene que se note.

        Prometen «qué cubre» esta capacitación, así que solo valen si los
        escribe alguien que la conoce. Medio llenarlos —o rellenarlos con lo que
        uno supone viendo el título— es peor que dejarlos vacíos: quien lee la
        ficha no puede distinguir un objetivo real de uno inventado, y acaba sin
        fiarse de ninguno.

        Una ficha con el video y nada más es honesta: ahí está la sesión.
      */}
      <Campo
        etiqueta="Resumen"
        ayuda="Opcional. Una o dos líneas, si sabes de qué va. Mejor vacío que a medias."
      >
        <textarea
          name="summary"
          rows={3}
          placeholder="Emite juegos de planos confiables: revisiones, láminas y exportación con estándar Sohersa."
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <Campo
        etiqueta="Objetivos"
        ayuda="Opcional, uno por línea. Salen como «Al terminar sabrás», así que solo lo que de verdad cubra."
      >
        <textarea
          name="objectives"
          rows={3}
          placeholder={"Emitir revisiones sin romper el juego de planos\nAplicar la nomenclatura de láminas"}
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Instructor">
          <input name="instructor" placeholder="Misael Palomera" style={entrada} />
        </Campo>
        <Campo etiqueta="Puesto">
          <input name="instructorRole" placeholder="Líder de modelado" style={entrada} />
        </Campo>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Duración" ayuda="Ej. 2 h 40 min">
          <input name="duration" placeholder="2 h 40 min" style={entrada} />
        </Campo>
        <Campo etiqueta="Nivel">
          <select name="level" defaultValue="Básico" style={entrada}>
            <option>Básico</option>
            <option>Intermedio</option>
            <option>Avanzado</option>
          </select>
        </Campo>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Categoría">
          <input name="category" placeholder="Revit" style={entrada} />
        </Campo>
        <Campo etiqueta="Software">
          <input name="software" placeholder="Revit" style={entrada} />
        </Campo>
      </div>

      {/*
        La fecha manda el orden del catálogo: de la más reciente a la más
        antigua. Sin ella, la capacitación se va al final de la lista, después
        de todas las que sí la tienen.

        Es distinta de «Periodo», que es texto libre para mostrar: «ago 2026»
        se lee bien pero no se puede ordenar.
      */}
      <Campo
        etiqueta="Cuándo se impartió"
        ayuda="Manda el orden del catálogo. Sin fecha, la capacitación sale al final."
      >
        <input name="impartidaEn" type="date" style={entrada} />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Periodo" ayuda="Opcional. Texto que se muestra, ej. ago 2026">
          <input name="period" placeholder="ago 2026" style={entrada} />
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
      </div>

      <BotonEnviar pendienteTexto="Creando…">Crear capacitación</BotonEnviar>
    </form>
  );
}
