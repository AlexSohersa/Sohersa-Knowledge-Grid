"use client";

import { useState } from "react";
import { crearDocumentoBiblioteca, codigoSugerido } from "@/app/(app)/admin/acciones";
import { BotonEnviar, Campo, ErrorAccion, TituloFormulario, entrada } from "./campos";

/**
 * Los estados de capacitación que pinta la biblioteca.
 *
 * Son los mismos que trae el cronograma: si aquí se escribiera otro, saldría
 * una etiqueta de un color distinto al resto y se notaría que ese documento no
 * vino por el camino normal.
 */
const ESTADOS = ["", "Pendiente", "Agendada", "Impartida"];

/**
 * Dar de alta un documento en la biblioteca, sin pasar por el cronograma.
 *
 * Pide lo justo para que el documento se vea IGUAL que los sincronizados: el
 * nombre del archivo, su tipo y su tamaño no se preguntan porque Drive ya los
 * sabe, y escribirlos a mano solo serviría para equivocarse.
 *
 * El código se sugiere solo al elegir sección —1.1, 1.2…— siguiendo la cuenta
 * del cronograma, y se puede corregir si hace falta.
 */
export function FormularioDocumento({ secciones }: { secciones: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const [seccion, setSeccion] = useState("");
  const [nuevaSeccion, setNuevaSeccion] = useState("");
  const [code, setCode] = useState("");

  const creandoSeccion = seccion === "__nueva__";
  const seccionFinal = creandoSeccion ? nuevaSeccion : seccion;

  /*
   * Al elegir sección se pide el código que le tocaría.
   *
   * Se consulta al servidor en vez de calcularlo aquí porque la cuenta depende
   * de lo que ya hay en la base, y el navegador no lo sabe. Si falla, el campo
   * se queda vacío y al guardar se asigna igualmente: es una comodidad, no un
   * requisito.
   */
  async function alElegirSeccion(valor: string) {
    setSeccion(valor);
    setCode("");

    if (!valor || valor === "__nueva__") return;

    try {
      setCode(await codigoSugerido(valor));
    } catch {
      // Sin sugerencia: el código se asigna al guardar.
    }
  }

  async function enviar(form: FormData) {
    setError(null);
    setExito(false);

    // La sección efectiva es la escrita cuando se está creando una nueva.
    form.set("section", seccionFinal);

    const res = await crearDocumentoBiblioteca(form);

    if (!res.ok) {
      setError(res.error ?? "No se pudo dar de alta.");
      return;
    }

    setExito(true);
    setCode("");
    setTimeout(() => setExito(false), 3500);
  }

  return (
    <form action={enviar} className="kc-panel kc-rise" style={{ padding: "18px 19px" }}>
      <TituloFormulario ayuda="El archivo ya tiene que estar en Drive. Su nombre, tipo y tamaño se leen de ahí.">
        Subir documento
      </TituloFormulario>

      <ErrorAccion mensaje={error} />

      {exito && (
        <p
          role="status"
          style={{
            fontSize: 11.5,
            color: "var(--kc-cap-ink, #178A49)",
            margin: "0 0 10px",
            padding: "8px 11px",
            background: "var(--kc-cap-soft, #E4F8EB)",
            borderRadius: 9,
          }}
        >
          Listo. Ya está en la biblioteca.
        </p>
      )}

      <Campo etiqueta="Título">
        <input
          name="title"
          required
          placeholder="Instructivo para el uso de revisiones en Revit"
          style={entrada}
        />
      </Campo>

      <Campo etiqueta="Sección" ayuda="Dónde aparece en el menú de la biblioteca">
        <select
          value={seccion}
          onChange={(e) => void alElegirSeccion(e.target.value)}
          required
          style={entrada}
        >
          <option value="">Elige una…</option>
          {secciones.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="__nueva__">+ Sección nueva</option>
        </select>
      </Campo>

      {creandoSeccion && (
        <Campo etiqueta="Nombre de la sección nueva">
          <input
            value={nuevaSeccion}
            onChange={(e) => setNuevaSeccion(e.target.value)}
            required
            placeholder="Plantillas de Navisworks"
            style={entrada}
          />
        </Campo>
      )}

      <Campo
        etiqueta="Enlace del archivo en Drive"
        ayuda="Del archivo, no de la carpeta. De aquí salen el nombre, el tipo y el tamaño."
      >
        <input
          name="enlace"
          required
          placeholder="https://drive.google.com/file/d/…/view"
          style={entrada}
        />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10 }}>
        <Campo etiqueta="Código" ayuda="Se sugiere">
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="1.12"
            style={entrada}
          />
        </Campo>
        <Campo etiqueta="Autor" ayuda="Sale junto al documento, con su inicial">
          <input name="author" placeholder="Misael Palomera" style={entrada} />
        </Campo>
      </div>

      <Campo
        etiqueta="Capacitación"
        ayuda="Opcional. La etiqueta que dice si ya se impartió."
      >
        <select name="training" defaultValue="" style={entrada}>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e || "— sin capacitación asociada"}
            </option>
          ))}
        </select>
      </Campo>

      <BotonEnviar pendienteTexto="Subiendo…">Subir a la biblioteca</BotonEnviar>

      <p
        style={{
          fontSize: 10.5,
          color: "var(--kc-ink-4)",
          margin: "10px 0 0",
          lineHeight: 1.5,
        }}
      >
        Lo que subas aquí no lo toca la sincronización del cronograma: seguirá
        estando después de traer la hoja al día.
      </p>
    </form>
  );
}
