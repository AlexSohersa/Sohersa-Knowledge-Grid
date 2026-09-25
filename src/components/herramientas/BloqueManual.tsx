import { AVISOS } from "@/components/herramientas/BloqueDescarga";
import { VerManual } from "@/components/herramientas/VerManual";
import type { Herramienta } from "@/modules/herramientas/domain/herramienta";

/**
 * El manual de una herramienta, junto a su archivo.
 *
 * Ligado a la herramienta por su propio enlace, no buscado por nombre en la
 * biblioteca: esa coincidencia se rompe en cuanto alguien renombra algo, y
 * además no llegaba a la ficha.
 *
 * «Ver» lo abre en el MISMO visor de la biblioteca, sin salir del Centro.
 * «Descargar» pasa por la plataforma, como el archivo de la herramienta.
 */
export function BloqueManual({
  h,
  fallo,
}: {
  h: Herramienta;
  /** El motivo con el que volvió un intento fallido (`?manual=`). */
  fallo?: string;
}) {
  if (!h.manualDriveId && !h.manualUrl?.trim()) return null;

  const base = `/api/herramientas/${encodeURIComponent(h.id)}/descarga?archivo=manual`;
  const aviso = fallo ? AVISOS[fallo] ?? AVISOS.acceso : null;

  const boton: React.CSSProperties = {
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
    // «Ver» es un botón y «Descargar» un enlace: estas dos líneas hacen que
    // se vean iguales.
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          margin: "12px 0 0",
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
            background: "#E4F1FB",
            color: "#2E6C99",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
            <path d="M4 19a2 2 0 0 1 2-2h12M8 7h6M8 11h6" />
          </svg>
        </span>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--kc-ink)" }}>
            Manual de uso
          </div>
          <div style={{ fontSize: 11, color: "var(--kc-ink-3)", marginTop: 2 }}>
            {h.manualFileName ?? "Cómo instalarla y usarla"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <VerManual h={h} style={boton} />
          <a href={base} className="kc-btn" style={boton}>
            Descargar
          </a>
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
