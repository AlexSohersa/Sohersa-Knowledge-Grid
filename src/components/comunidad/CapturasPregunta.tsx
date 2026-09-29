"use client";

import { useState } from "react";
import type { ImagenPregunta } from "@/modules/comunidad/domain/pregunta";

/**
 * Las capturas de una pregunta.
 *
 * DE UN TAMAÑO QUE SE ENTIENDA SIN DOMINAR LA PÁGINA. A tamaño completo, una
 * captura de pantalla empuja las respuestas fuera de la vista y hay que
 * desplazarse para leer el hilo; en miniatura no se distingue de qué habla. El
 * punto medio —unos 200 px de alto— deja reconocer la pantalla y el error, y
 * quien necesite el detalle la abre.
 *
 * Al pulsarla se ve completa sobre la página, sin salir de la pregunta: abrir
 * Drive en otra pestaña rompe la lectura del hilo por mirar una imagen.
 */
export function CapturasPregunta({ imagenes }: { imagenes: ImagenPregunta[] }) {
  const [abierta, setAbierta] = useState<ImagenPregunta | null>(null);

  if (imagenes.length === 0) return null;

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          margin: "14px 0 0",
        }}
      >
        {imagenes.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setAbierta(img)}
            className="kc-btn"
            title="Ver completa"
            style={{
              padding: 0,
              border: "1px solid var(--kc-line)",
              borderRadius: 10,
              overflow: "hidden",
              background: "#F7FAFC",
              cursor: "zoom-in",
              lineHeight: 0,
              maxWidth: "100%",
            }}
          >
            {/* Servida desde el servidor con la cuenta de quien mira: las
                direcciones públicas de Drive devuelven una página de inicio de
                sesión, no la imagen. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/imagen/${img.driveId}`}
              alt={img.fileName ?? "Captura de la pregunta"}
              loading="lazy"
              style={{
                maxHeight: 200,
                maxWidth: 320,
                width: "auto",
                height: "auto",
                display: "block",
              }}
            />
          </button>
        ))}
      </div>

      {abierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={abierta.fileName ?? "Captura"}
          onClick={() => setAbierta(null)}
          /*
           * Cerrar con Escape además del clic: quien abre una imagen con el
           * teclado espera poder cerrarla igual.
           */
          onKeyDown={(e) => {
            if (e.key === "Escape") setAbierta(null);
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(12,24,38,.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 28,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/imagen/${abierta.driveId}`}
            alt={abierta.fileName ?? "Captura de la pregunta"}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 18px 50px rgba(0,0,0,.4)",
            }}
          />

          <button
            type="button"
            onClick={() => setAbierta(null)}
            aria-label="Cerrar"
            style={{
              position: "absolute",
              top: 18,
              right: 20,
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "none",
              background: "rgba(255,255,255,.16)",
              color: "#fff",
              fontSize: 17,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
