import { registrarDescarga } from "@/app/(app)/acciones-descarga";
import {
  enlaceDeDescarga,
  enlaceDeVista,
  estiloArchivo,
} from "@/modules/herramientas/domain/descarga";
import type { Herramienta } from "@/modules/herramientas/domain/herramienta";

/**
 * El archivo de una herramienta, listo para bajar.
 *
 * Esto es lo que antes vivía en «Biblioteca › Automatizaciones», una sección
 * aparte que se pisaba con Herramientas —«Automatización» es además uno de los
 * tipos de herramienta—. Ahora una herramienta trae su archivo y se descarga
 * desde su propia ficha.
 *
 * EL BOTÓN DESCARGA, NO ABRE. El enlace que se copia de Drive lleva al visor:
 * una pestaña con la vista previa donde todavía hay que buscar «Descargar».
 * Aquí se construye la dirección de descarga directa, así que basta con
 * pulsar una vez. Al lado queda «Ver primero» para quien prefiera asomarse
 * antes de bajarse cuarenta megas.
 */
export function BloqueDescarga({ h }: { h: Herramienta }) {
  const descarga = enlaceDeDescarga(h.driveFileId, h.downloadUrl);
  if (!descarga) return null;

  const vista = enlaceDeVista(h.driveFileId, h.downloadUrl);
  const est = estiloArchivo(h.fileName);
  const enDrive = Boolean(h.driveFileId);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        margin: "20px 0 0",
        background: "#F7FAFC",
        border: "1px solid var(--kc-line)",
        borderRadius: 12,
        flexWrap: "wrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: est.soft,
          color: est.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9.5,
          fontWeight: 700,
          flexShrink: 0,
          letterSpacing: ".02em",
        }}
      >
        {est.ext}
      </span>

      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--kc-ink)" }}>
          {h.fileName ?? "Archivo de la herramienta"}
        </div>
        <div style={{ fontSize: 11, color: "var(--kc-ink-3)", marginTop: 2 }}>
          {[
            h.fileSizeText,
            h.compat,
            h.downloads > 0
              ? `${h.downloads} ${h.downloads === 1 ? "descarga" : "descargas"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Listo para descargar"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        {/*
          Un formulario y no un enlace suelto: así se puede contar la descarga
          en el servidor antes de llevar al archivo. Con un `<a>` no habría
          forma de enterarse de que alguien lo bajó, y las descargas son la
          única señal de qué se usa de verdad.
        */}
        <form action={registrarDescarga}>
          <input type="hidden" name="id" value={h.id} />
          <input type="hidden" name="destino" value={descarga} />
          <button
            type="submit"
            className="kc-btn"
            style={{
              border: "none",
              background: "var(--kc-green-solid,#178A49)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "9px 16px",
              borderRadius: 9,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
            </svg>
            Descargar
          </button>
        </form>

        {enDrive && vista && (
          <a
            href={vista}
            target="_blank"
            rel="noreferrer"
            className="kc-btn"
            style={{
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink-2)",
              fontSize: 12,
              fontWeight: 600,
              padding: "9px 14px",
              borderRadius: 9,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Ver primero
          </a>
        )}
      </div>
    </div>
  );
}
