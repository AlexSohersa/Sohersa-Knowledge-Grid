import {
  enlaceDeVista,
  esDescargable,
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
 * EL ARCHIVO SALE DE LA PLATAFORMA. El botón apunta a
 * `/api/herramientas/[id]/descarga`, que trae el archivo de Drive con la
 * cuenta de quien pulsa y lo entrega como adjunto: no hay pestaña de Drive ni
 * aviso del antivirus de por medio. Al lado queda «Ver primero» para quien
 * prefiera asomarse antes de bajarse cuarenta megas.
 */
export function BloqueDescarga({
  h,
  fallo,
}: {
  h: Herramienta;
  /** El motivo con el que volvió una descarga fallida (`?descarga=`). */
  fallo?: string;
}) {
  if (!esDescargable(h)) return null;

  const vista = enlaceDeVista(h.driveFileId, h.downloadUrl);
  const est = estiloArchivo(h.fileName);
  const enDrive = Boolean(h.driveFileId);

  const aviso = fallo ? AVISOS[fallo] ?? AVISOS.acceso : null;

  return (
    <>
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
          Un enlace a la ruta de la plataforma, no a Drive. La ruta cuenta la
          descarga en el servidor —la única señal de qué se usa de verdad— y
          lee el destino de la base, nunca de la petición.
        */}
        <a
          href={`/api/herramientas/${encodeURIComponent(h.id)}/descarga`}
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
            textDecoration: "none",
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
        </a>

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
    {aviso && (
      <p
        role="alert"
        style={{
          margin: "10px 0 0",
          padding: "9px 12px",
          background: "#FCE9EA",
          color: "#C23840",
          borderRadius: 9,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {aviso}
      </p>
    )}
    </>
  );
}

/** Por qué no salió el archivo, en palabras de quien lo pulsó. */
export const AVISOS: Record<string, string> = {
  acceso:
    "No se pudo traer el archivo de Drive. Puede que tu cuenta no tenga acceso a él o que se haya movido; pide a quien lo subió que lo comparta contigo.",
  sesion: "Tu sesión no tiene permisos de Google. Cierra sesión y vuelve a entrar.",
  tipo: "El enlace apunta a una carpeta o a un documento de Google, no a un archivo. En Administración hay que poner el enlace del .zip.",
};
