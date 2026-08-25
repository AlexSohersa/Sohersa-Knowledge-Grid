"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { proponerFaq } from "@/app/(app)/faq/acciones";

/**
 * El formulario de «Agregar FAQ», según el borrador.
 *
 * Dos campos obligatorios y el resto opcional, a propósito: quien acaba de
 * toparse con un problema muchas veces no sabe todavía por qué pasa ni cómo se
 * arregla —para eso propone la ficha—. Exigirle la solución convertiría el
 * formulario en un muro y se quedarían sin reportar justo los problemas que
 * nadie ha resuelto.
 *
 * El nombre y el área NO se piden: salen de la sesión. El borrador los muestra
 * como campos porque venía pensado para un portal sin inicio de sesión; aquí ya
 * sabemos quién eres, y volver a preguntarlo invita a equivocarse al teclear.
 */
export function FormularioPropuesta({
  plataformas,
  subcategorias,
  areas,
  autor,
}: {
  plataformas: string[];
  /** Las subcategorías del catálogo, para clasificar la captura en Drive. */
  subcategorias: string[];
  /** Las áreas del padrón, para el desplegable. */
  areas: string[];
  autor: { nombre: string; area: string | null };
}) {
  const router = useRouter();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [pendiente, iniciar] = useTransition();

  /*
   * LO ESCRITO NO SE PIERDE.
   *
   * React vacía el `<form>` en cuanto la acción termina, y con campos sin valor
   * propio eso borraba todo lo tecleado justo cuando la validación fallaba: la
   * persona veía un error en rojo y el formulario en blanco, teniendo que
   * reescribir varios párrafos por una línea demasiado corta. Guardando aquí lo
   * enviado y devolviéndolo como `value`, el texto sigue donde estaba y solo
   * hay que corregir lo que falta.
   */
  const [valores, setValores] = useState<Record<string, string>>({
    nombre: autor.nombre,
    area: autor.area ?? "",
  });

  function cambiar(campo: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValores((v) => ({ ...v, [campo]: e.target.value }));
  }

  function enviar(form: FormData) {
    setErrores({});
    setError(null);

    // Lo que va en el envío se recuerda antes de mandarlo: si algo falla, es lo
    // que se vuelve a pintar.
    const enviado: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") enviado[k] = v;
    }
    setValores((prev) => ({ ...prev, ...enviado }));

    iniciar(async () => {
      const res = await proponerFaq(form);
      if (res.ok) {
        setListo(true);
        return;
      }
      setErrores(res.errores ?? {});
      setError(res.error ?? null);
    });
  }

  /* ── Enviado ────────────────────────────────────────────────────────── */
  if (listo) {
    return (
      <div className="kc-panel kc-pop" style={{ padding: "34px 28px", textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--kc-cap-soft)",
            color: "var(--kc-cap-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--kc-ink)", margin: "0 0 7px" }}>
          Tu propuesta llegó
        </h2>
        <p style={{ fontSize: 13, color: "var(--kc-ink-3)", margin: "0 0 20px", lineHeight: 1.6, maxWidth: 400, marginInline: "auto" }}>
          Estandarización y Calidad la revisa antes de publicarla. Te avisamos aquí
          mismo cuando la resuelvan.
        </p>

        <div style={{ display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => router.push("/faq")}
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
            Volver a las fichas
          </button>
          <button
            type="button"
            onClick={() => setListo(false)}
            className="kc-btn"
            style={{
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink-2)",
              fontSize: 12.5,
              fontWeight: 600,
              padding: "10px 17px",
              borderRadius: 10,
            }}
          >
            Proponer otra
          </button>
        </div>
      </div>
    );
  }

  /* ── El formulario ──────────────────────────────────────────────────── */
  return (
    <form action={enviar} className="kc-panel" style={{ padding: "22px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 17 }}>
        <Campo
          etiqueta="NOMBRE DEL PROBLEMA"
          obligatorio
          error={errores.title}
          ayuda="Una línea que lo resuma, como se lo contarías a alguien."
        >
          <input
            name="title"
            required
            maxLength={160}
            value={valores.title ?? ""}
            onChange={cambiar("title")}
            placeholder="El vínculo aparece cargado pero no se ven sus elementos"
            style={entrada}
          />
        </Campo>

        <Campo
          etiqueta="DESCRIPCIÓN DEL PROBLEMA"
          obligatorio
          error={errores.description}
          ayuda="Qué estabas haciendo, qué esperabas y qué pasó."
        >
          <textarea
            name="description"
            required
            rows={5}
            maxLength={2000}
            value={valores.description ?? ""}
            onChange={cambiar("description")}
            style={{ ...entrada, resize: "vertical" }}
          />
        </Campo>

        {/*
          Nombre y área, como en el borrador — pero rellenados desde el padrón.
          La sesión ya sabe quién eres; pedirlo en blanco sería hacer teclear
          algo que la aplicación conoce mejor. Se dejan editables porque hay
          quien trabaja para dos áreas.
        */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Campo etiqueta="NOMBRE DEL COLABORADOR" obligatorio>
            <input
              name="nombre"
              required
              maxLength={120}
              value={valores.nombre ?? ""}
              onChange={cambiar("nombre")}
              style={entrada}
            />
          </Campo>

          <Campo etiqueta="ÁREA / DEPARTAMENTO" obligatorio>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Campo etiqueta="SOFTWARE" ayuda="Si sabes dónde ocurre.">
            <select name="platform" style={entrada} value={valores.platform ?? ""} onChange={cambiar("platform")}>
              <option value="">No estoy seguro</option>
              {plataformas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="TEMA" ayuda="Ayuda a archivar la captura.">
            <select name="subcategoria" style={entrada} value={valores.subcategoria ?? ""} onChange={cambiar("subcategoria")}>
              <option value="">Sin clasificar</option>
              {subcategorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo etiqueta="IMAGEN DEL PROBLEMA" error={errores.imagen} ayuda="Se guarda en Drive, no aquí.">
          <SelectorImagen />
        </Campo>

        <Campo
          etiqueta="SOLUCIÓN"
          ayuda="Si ya lo resolviste, cuéntanos cómo. Si no, déjalo en blanco."
        >
          <textarea
            name="solution"
            rows={4}
            maxLength={2000}
            value={valores.solution ?? ""}
            onChange={cambiar("solution")}
            style={{ ...entrada, resize: "vertical" }}
          />
        </Campo>

        {error && (
          <p role="alert" style={{ fontSize: 12, color: "#C23840", margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
            {pendiente ? "Enviando…" : "Enviar FAQ"}
          </button>

          <span style={{ fontSize: 11.5, color: "var(--kc-ink-4)" }}>
            <span style={{ color: "var(--kc-faq-ink)" }}>*</span> campos obligatorios · la propuesta
            llega a Estandarización y Calidad, que la revisa antes de publicarla.
          </span>
        </div>
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

/**
 * La etiqueta y su control.
 *
 * Es un `<div>`, NO un `<label>`, y ahí está el detalle que costó encontrar:
 * con `<label>`, el selector de imagen —que lleva su propio `<label>` para
 * abrir el diálogo de archivos— quedaba anidado dentro de otro. Eso es HTML
 * inválido, y el navegador lo arregla partiendo el anidamiento, con lo que el
 * `<input type="file">` acababa FUERA del formulario: la propuesta se enviaba
 * sin imagen y sin ningún error, como si nadie hubiera adjuntado nada.
 */
function Campo({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  children,
}: {
  etiqueta: string;
  obligatorio?: boolean;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: ".11em",
          color: "var(--kc-ink-4)",
          marginBottom: 7,
        }}
      >
        {etiqueta}
        {obligatorio && <span style={{ color: "var(--kc-faq-ink)" }}> *</span>}
      </div>

      {children}

      {ayuda && !error && (
        <div style={{ fontSize: 11, color: "var(--kc-ink-4)", marginTop: 5 }}>{ayuda}</div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: 11, color: "#C23840", marginTop: 5 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * El campo de adjuntar captura, con vista previa.
 *
 * Se muestra la miniatura antes de enviar porque una captura equivocada —la
 * carpeta de descargas está llena de imágenes parecidas— solo se detecta
 * viéndola, y descubrirlo después obliga a rehacer la propuesta entera.
 */
function SelectorImagen() {
  const [previa, setPrevia] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);

  function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setPrevia(null);
      setNombre(null);
      return;
    }
    setNombre(f.name);
    // `createObjectURL` no lee el archivo: solo crea una referencia local, así
    // que una imagen de varios megas se previsualiza al instante.
    setPrevia(URL.createObjectURL(f));
  }

  return (
    <div>
      <label
        className="kc-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "1px dashed var(--kc-line-2)",
          borderRadius: 10,
          background: "var(--kc-bg)",
          color: "var(--kc-ink-3)",
          fontSize: 12,
          fontWeight: 600,
          padding: "14px 12px",
          cursor: "pointer",
        }}
      >
        <input
          type="file"
          name="imagen"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={elegida}
          style={{ display: "none" }}
        />
        {nombre ? `Cambiar captura · ${nombre}` : "Adjuntar captura"}
      </label>

      {previa && (
        /* Es un blob local del navegador: `next/image` no puede optimizar lo
           que todavía no existe en ningún servidor. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previa}
          alt="Vista previa de la captura"
          style={{
            marginTop: 9,
            maxWidth: "100%",
            maxHeight: 220,
            display: "block",
            borderRadius: 8,
            border: "1px solid var(--kc-line)",
          }}
        />
      )}
    </div>
  );
}
