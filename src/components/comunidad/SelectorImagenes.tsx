"use client";

import { useRef, useState } from "react";

/** Cuántas caben. El mismo tope que aplica el servidor. */
const TOPE = 4;

/**
 * Elegir capturas para una pregunta.
 *
 * SE VE LO QUE SE ELIGIÓ, y no es un adorno: un `<input type="file">` a secas
 * dice «3 archivos» y nada más, así que quien sube no sabe si mandó la captura
 * correcta hasta que publica. Con la miniatura delante, un error se ve antes de
 * publicarlo.
 *
 * Las miniaturas se pintan con `URL.createObjectURL`, que las lee del propio
 * archivo sin subir nada: hasta que no se publica, la imagen no sale del
 * equipo.
 */
export function SelectorImagenes({
  nombre = "imagenes",
  etiqueta = "Capturas",
  ayuda = "Opcional. Hasta 4 imágenes de 2 MB.",
}: {
  nombre?: string;
  etiqueta?: string;
  ayuda?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [previas, setPrevias] = useState<{ url: string; nombre: string; peso: string }[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    setAviso(null);

    // Las que ya no se muestran se liberan: cada `createObjectURL` retiene el
    // archivo en memoria hasta que se revoca.
    for (const p of previas) URL.revokeObjectURL(p.url);

    if (archivos.length > TOPE) {
      setAviso(`Solo caben ${TOPE}. Se tomarán las primeras ${TOPE}.`);
    }

    const grandes = archivos.filter((a) => a.size > 2 * 1024 * 1024);
    if (grandes.length > 0) {
      setAviso(
        `${grandes.map((a) => `«${a.name}»`).join(", ")} ${grandes.length === 1 ? "pesa" : "pesan"} más de 2 MB y no se ${grandes.length === 1 ? "subirá" : "subirán"}.`,
      );
    }

    setPrevias(
      archivos.slice(0, TOPE).map((a) => ({
        url: URL.createObjectURL(a),
        nombre: a.name,
        peso:
          a.size < 1024 * 1024
            ? `${Math.round(a.size / 1024)} KB`
            : `${(a.size / 1024 / 1024).toFixed(1)} MB`,
      })),
    );
  }

  function limpiar() {
    for (const p of previas) URL.revokeObjectURL(p.url);
    setPrevias([]);
    setAviso(null);
    if (entrada.current) entrada.current.value = "";
  }

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
        onChange={alElegir}
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
                {/* Una miniatura local: `next/image` no sirve aquí porque la
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
                  className="kc-clamp-1"
                  style={{ fontSize: 9.5, color: "var(--kc-ink-4)", marginTop: 3 }}
                >
                  {p.peso}
                </figcaption>
              </figure>
            ))}
          </div>

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
