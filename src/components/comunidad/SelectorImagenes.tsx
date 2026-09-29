"use client";

import { useRef, useState } from "react";
import { encoger, peso } from "./comprimir";

/** Cuántas caben. El mismo tope que aplica el servidor. */
const TOPE = 4;

interface Previa {
  url: string;
  nombre: string;
  original: number;
  final: number;
  encogida: boolean;
}

/**
 * Elegir capturas para una pregunta.
 *
 * SE ENCOGEN AQUÍ, antes de salir del equipo. El archivo viaja al servidor y de
 * ahí a Drive, y ese paso intermedio tiene un tope que no se puede subir desde
 * el código. Antes eso significaba rechazar una captura de 6 MB con un «pesa
 * demasiado» y dejar a quien la mandaba sin saber qué hacer.
 *
 * Ahora se reduce a un tamaño que cabe —1600 px de ancho, calidad alta— sin que
 * nadie tenga que abrir un editor. Una captura de pantalla sigue leyéndose
 * perfectamente; lo que se pierde es resolución que nadie iba a mirar.
 *
 * SE VE LO QUE SE ELIGIÓ: un `<input type="file">` a secas dice «3 archivos» y
 * nada más, así que un error se descubre después de publicar. Con la miniatura
 * delante, se ve antes.
 */
export function SelectorImagenes({
  nombre = "imagenes",
  etiqueta = "Capturas",
  ayuda = "Opcional. Hasta 4 imágenes; las grandes se ajustan solas.",
}: {
  nombre?: string;
  etiqueta?: string;
  ayuda?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [previas, setPrevias] = useState<Previa[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const elegidos = Array.from(e.target.files ?? []);
    if (elegidos.length === 0) return;

    setAviso(elegidos.length > TOPE ? `Solo caben ${TOPE}. Se tomarán las primeras ${TOPE}.` : null);

    for (const p of previas) URL.revokeObjectURL(p.url);
    setTrabajando(true);

    const archivos = elegidos.slice(0, TOPE);
    const listas: File[] = [];
    const nuevasPrevias: Previa[] = [];

    for (const a of archivos) {
      const encogida = await encoger(a);
      listas.push(encogida);
      nuevasPrevias.push({
        url: URL.createObjectURL(encogida),
        nombre: a.name,
        original: a.size,
        final: encogida.size,
        encogida: encogida.size < a.size,
      });
    }

    /*
     * Las versiones encogidas SUSTITUYEN a las originales en el formulario.
     *
     * Un `<input type="file">` no admite que se le asigne un `File` a mano,
     * pero sí un `DataTransfer` con la lista completa. Sin esto, el navegador
     * mandaría los archivos originales y todo el encogido no habría servido de
     * nada.
     */
    try {
      const dt = new DataTransfer();
      for (const f of listas) dt.items.add(f);
      if (entrada.current) entrada.current.files = dt.files;
    } catch {
      // Navegador que no lo admite: se manda lo original y decide el servidor.
    }

    setPrevias(nuevasPrevias);
    setTrabajando(false);
  }

  function limpiar() {
    for (const p of previas) URL.revokeObjectURL(p.url);
    setPrevias([]);
    setAviso(null);
    if (entrada.current) entrada.current.value = "";
  }

  const seEncogio = previas.some((p) => p.encogida);

  return (
    <div style={{ marginBottom: 14 }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--kc-ink-2)" }}>
          {etiqueta}
        </span>
        <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>{ayuda}</span>
      </span>

      <input
        ref={entrada}
        type="file"
        name={nombre}
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        onChange={(e) => void alElegir(e)}
        style={{
          width: "100%",
          border: "1px solid var(--kc-line)",
          borderRadius: 9,
          padding: "8px 10px",
          fontSize: 11.5,
          color: "var(--kc-ink-2)",
          background: "#fff",
          boxSizing: "border-box",
        }}
      />

      {trabajando && (
        <p style={{ fontSize: 11, color: "var(--kc-ink-3)", margin: "7px 0 0" }}>
          Preparando las imágenes…
        </p>
      )}

      {aviso && (
        <p
          style={{
            margin: "7px 0 0",
            padding: "7px 9px",
            background: "#FDF3DC",
            color: "#8A6410",
            borderRadius: 7,
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {aviso}
        </p>
      )}

      {previas.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {previas.map((p) => (
              <figure key={p.url} style={{ margin: 0, width: 92 }}>
                {/* Miniatura local: `next/image` no sirve aquí porque la
                    dirección es un blob del navegador, sin servidor detrás. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.nombre}
                  style={{
                    width: 92,
                    height: 68,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid var(--kc-line)",
                    display: "block",
                  }}
                />
                <figcaption
                  style={{ fontSize: 9.5, color: "var(--kc-ink-4)", marginTop: 3, lineHeight: 1.35 }}
                >
                  {p.encogida ? (
                    <>
                      <span style={{ textDecoration: "line-through" }}>{peso(p.original)}</span>{" "}
                      <span style={{ color: "#178A49", fontWeight: 600 }}>{peso(p.final)}</span>
                    </>
                  ) : (
                    peso(p.final)
                  )}
                </figcaption>
              </figure>
            ))}
          </div>

          {seEncogio && (
            <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: "6px 0 0", lineHeight: 1.5 }}>
              Las imágenes grandes se ajustaron para que suban rápido. Se siguen
              leyendo igual.
            </p>
          )}

          <button
            type="button"
            onClick={limpiar}
            className="kc-btn"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--kc-ink-3)",
              fontSize: 11,
              padding: "6px 0 0",
              cursor: "pointer",
            }}
          >
            Quitar todas
          </button>
        </>
      )}
    </div>
  );
}
