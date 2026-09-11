"use client";

import { useState } from "react";
import { agregarTema, subirVideoTema } from "@/app/(app)/admin/acciones";
import type { Capacitacion } from "@/modules/capacitaciones/domain/capacitacion";
import { BotonEnviar, Campo, ErrorAccion, TituloFormulario, entrada } from "./campos";

/**
 * Agregar un tema a una capacitación.
 *
 * DOS VÍAS PARA EL VIDEO, porque las grabaciones llegan de dos maneras y antes
 * solo se contemplaba una:
 *
 *   · Está en Drive —lo normal cuando la sesión fue por Meet—: se pega el
 *     enlace y el sistema COPIA el archivo a la carpeta del Centro. Copiar solo
 *     exige poder verlo, así que no hay que pedirle permisos a quien grabó, y
 *     la copia queda bajo nuestro control.
 *   · Está en la computadora: se sube, y va directo a «01 Video» de esa
 *     capacitación, renombrado con su código.
 *
 * En ambos casos acaba en el mismo sitio y con el mismo nombre. Lo que cambia
 * es de dónde viene.
 *
 * LO QUE SE QUITÓ Y POR QUÉ. Había un campo «Nº» para escribir el número del
 * tema, y otro de «Descripción». El número ahora se calcula solo —el sistema
 * sabe cuántos temas hay, pedirlo solo servía para que llegaran dos «03»—. La
 * descripción se quita del camino rápido porque invita a rellenarla con lo que
 * uno supone que cubre el video; si hace falta, se añade luego editando, ya con
 * el material delante.
 */
export function AgregarTema({ cap }: { cap: Capacitacion }) {
  const [via, setVia] = useState<"enlace" | "archivo">("enlace");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const siguiente = String(cap.temas.length + 1).padStart(2, "0");

  async function conEnlace(form: FormData) {
    setError(null);
    setAviso(null);

    const res = await agregarTema(cap.id, form);

    // `ok` con mensaje es un aviso, no un fallo: el tema se creó, pero algo
    // secundario no salió —el video que no se dejó copiar, típicamente—.
    if (res.ok && res.error) setAviso(res.error);
    else if (!res.ok) setError(res.error ?? "No se pudo agregar.");
  }

  async function conArchivo(form: FormData) {
    setError(null);
    setAviso(null);

    const res = await subirVideoTema(cap.id, form);
    if (!res.ok) setError(res.error ?? "No se pudo subir.");
  }

  return (
    <div className="kc-panel kc-rise" style={{ padding: "18px 19px" }}>
      <TituloFormulario ayuda={`Será el tema ${siguiente}. El video se guarda en la carpeta del Centro.`}>
        Agregar tema
      </TituloFormulario>

      <ErrorAccion mensaje={error} />

      {aviso && (
        <p
          style={{
            margin: "0 0 12px",
            padding: "8px 10px",
            background: "#FDF3DC",
            color: "#8A6410",
            borderRadius: 8,
            fontSize: 11.5,
            lineHeight: 1.5,
          }}
        >
          {aviso}
        </p>
      )}

      {/* De dónde sale el video. */}
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 4,
          padding: 3,
          background: "#F1F5F9",
          borderRadius: 9,
          marginBottom: 14,
        }}
      >
        <Pestana activa={via === "enlace"} onClick={() => setVia("enlace")}>
          Ya está en Drive
        </Pestana>
        <Pestana activa={via === "archivo"} onClick={() => setVia("archivo")}>
          Subir desde mi equipo
        </Pestana>
      </div>

      {via === "enlace" ? (
        <form action={conEnlace} key="enlace">
          <Campo etiqueta="Título del tema">
            <input
              name="title"
              required
              defaultValue={cap.temas.length === 0 ? "Grabación de la sesión" : ""}
              placeholder="Grabación de la sesión"
              style={entrada}
            />
          </Campo>

          <Campo
            etiqueta="Enlace del video"
            ayuda="De Drive se copia a la carpeta del Centro. YouTube y enlaces directos se dejan como están."
          >
            <input
              name="videoUrl"
              placeholder="https://drive.google.com/file/d/…/view"
              style={entrada}
            />
          </Campo>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo etiqueta="Duración" ayuda="Opcional">
              <input name="duration" placeholder="1 h 20 min" style={entrada} />
            </Campo>
            <Campo etiqueta="Tipo">
              <select name="kind" defaultValue="Video" style={entrada}>
                <option>Video</option>
                <option>Presentación</option>
                <option>Ejercicio</option>
                <option>Lectura</option>
              </select>
            </Campo>
          </div>

          <BotonEnviar pendienteTexto="Agregando…">Agregar tema</BotonEnviar>
        </form>
      ) : (
        <form action={conArchivo} key="archivo">
          <Campo etiqueta="Título del tema">
            <input
              name="title"
              required
              defaultValue={cap.temas.length === 0 ? "Grabación de la sesión" : ""}
              placeholder="Grabación de la sesión"
              style={entrada}
            />
          </Campo>

          <Campo
            etiqueta="Archivo de video"
            ayuda="Va a «01 Video» de esta capacitación, con su código en el nombre."
          >
            <input
              type="file"
              name="archivo"
              accept="video/*"
              required
              style={{ ...entrada, padding: "7px 9px" }}
            />
          </Campo>

          <Campo etiqueta="Duración" ayuda="Opcional">
            <input name="duration" placeholder="1 h 20 min" style={entrada} />
          </Campo>

          <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: "0 0 12px", lineHeight: 1.5 }}>
            Una grabación larga puede pasarse del tamaño que admite el formulario.
            Si eso ocurre, súbela a Drive desde el navegador y pega el enlace en la
            otra pestaña: acaba en el mismo sitio.
          </p>

          <BotonEnviar pendienteTexto="Subiendo…">Subir y agregar</BotonEnviar>
        </form>
      )}
    </div>
  );
}

function Pestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      style={{
        flex: 1,
        border: "none",
        borderRadius: 7,
        padding: "7px 10px",
        fontSize: 11.5,
        fontWeight: 600,
        cursor: "pointer",
        background: activa ? "#fff" : "transparent",
        color: activa ? "var(--kc-ink)" : "var(--kc-ink-3)",
        boxShadow: activa ? "0 1px 3px rgba(16,32,52,.08)" : "none",
      }}
    >
      {children}
    </button>
  );
}
