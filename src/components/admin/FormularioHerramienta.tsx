"use client";

import Link from "next/link";
import { useState } from "react";
import { crearHerramienta, editarHerramienta } from "@/app/(app)/admin/acciones";
import {
  ESTADOS_ADOPCION,
  etiquetaAdopcion,
  explicacionAdopcion,
  type EstadoAdopcion,
  type Herramienta,
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

/**
 * Registrar una herramienta en el catálogo, o editar una que ya está.
 *
 * Con `herramienta` el formulario llega relleno y guarda sobre ella. Hace
 * falta poder editar: el nombre es único, así que sin esto una herramienta
 * registrada con un dato mal —un enlace de descarga que faltó— no tenía
 * arreglo, ni siquiera dándola de alta otra vez.
 */
export function FormularioHerramienta({ herramienta: h }: { herramienta?: Herramienta } = {}) {
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [estado, setEstado] = useState<EstadoAdopcion>(h?.status ?? "DISPONIBLE");

  async function enviar(form: FormData) {
    const res = h ? await editarHerramienta(h.id, form) : await crearHerramienta(form);
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
        {h ? `Editar ${h.name}` : "Nueva herramienta"}
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
          {h ? "Guardada. La ficha ya muestra los cambios." : "Registrada. Ya está en el catálogo."}
        </p>
      )}

      <Campo etiqueta="Nombre">
        <input name="name" required defaultValue={h?.name ?? ""} placeholder="Autodesk Revit" style={entrada} />
      </Campo>

      <Campo etiqueta="Descripción">
        <textarea
          name="description"
          defaultValue={h?.description ?? ""}
          rows={3}
          placeholder="Modelado y documentación BIM. Herramienta principal de producción."
          style={{ ...entrada, lineHeight: 1.55, resize: "vertical" }}
        />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Clase">
          <select name="kind" defaultValue={h?.kind ?? "Software"} style={entrada}>
            <option>Software</option>
            <option>Plataforma</option>
            <option>Automatización</option>
            <option>Interno</option>
          </select>
        </Campo>
        <Campo etiqueta="Versión">
          <input name="version" defaultValue={h?.version ?? ""} placeholder="2026" style={entrada} />
        </Campo>
      </div>

      <Campo etiqueta="Licenciamiento">
        <input name="license" defaultValue={h?.license ?? ""} placeholder="Licencia por usuario" style={entrada} />
      </Campo>

      <Campo etiqueta="Disciplinas">
        <input name="discipline" defaultValue={h?.discipline ?? ""} placeholder="Modelado · Documentación" style={entrada} />
      </Campo>

      {/*
        El archivo descargable.

        Antes esto vivía en «Biblioteca › Automatizaciones», una sección aparte
        que se pisaba con esta: «Automatización» es además uno de los tipos de
        herramienta, así que Dynamo salía en un sitio y un script hecho con
        Dynamo en el otro. Ahora es lo mismo: una herramienta puede traer su
        archivo, y quien entra lo descarga de aquí.

        Es OPCIONAL a propósito: Revit o ACC no se descargan de ningún sitio
        nuestro, y su ficha sigue teniendo sentido sin archivo.
      */}
      <Campo
        etiqueta="Enlace de descarga"
        ayuda="Opcional. El enlace del archivo en Drive (un .zip, un .dyn…), no de la carpeta. La plataforma lo trae de Drive y lo entrega al pulsar «Descargar»."
      >
        <input
          name="downloadUrl"
          defaultValue={h?.downloadUrl ?? ""}
          placeholder="https://drive.google.com/file/d/…/view"
          style={entrada}
        />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo etiqueta="Nombre del archivo" ayuda="Vacío: se toma de Drive">
          <input name="fileName" defaultValue={h?.fileName ?? ""} placeholder="Renombrar-vistas.dyn" style={entrada} />
        </Campo>
        <Campo etiqueta="Tamaño" ayuda="Vacío: se toma de Drive">
          <input name="fileSizeText" defaultValue={h?.fileSizeText ?? ""} placeholder="2.4 MB" style={entrada} />
        </Campo>
      </div>

      <Campo etiqueta="Compatibilidad" ayuda="Opcional. Con qué funciona.">
        <input name="compat" defaultValue={h?.compat ?? ""} placeholder="Revit 2023–2025" style={entrada} />
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
        <select name="accent" defaultValue={h?.accent ?? "#32D66B"} style={entrada}>
          {ACENTOS.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <BotonEnviar pendienteTexto={h ? "Guardando…" : "Registrando…"}>
        {h ? "Guardar cambios" : "Registrar herramienta"}
      </BotonEnviar>

      {h && (
        <Link
          href="/admin/herramientas"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 10,
            fontSize: 11.5,
            color: "var(--kc-ink-3)",
          }}
        >
          Cancelar y registrar una nueva
        </Link>
      )}
    </form>
  );
}
