"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/layout/icons";
import { estiloExt, extDeArchivo } from "@/modules/shared/domain/conocimiento";
import { haceCuanto, tamano } from "@/modules/shared/domain/formato";
import type { Documento } from "@/modules/biblioteca/domain/documento";

/**
 * El visor de documentos.
 *
 * Junta lo mejor de los dos lados: el marco navy a pantalla completa y los
 * controles de zoom del diseño del Centro, más las acciones que ya funcionaban
 * en Digital Core —descargar, abrir en Drive, panel de información—.
 *
 * El documento se incrusta desde Drive con `/preview` y no con `/view`: la
 * vista normal trae su propia barra y en un iframe intenta salirse del marco.
 *
 * Se lee con la cuenta de cada quien, así que solo se ve lo que esa persona ya
 * puede abrir en Drive. El Centro hereda permisos, no los amplía.
 */
export function VisorDocumento({
  doc,
  onCerrar,
}: {
  doc: Documento;
  onCerrar: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [ajustado, setAjustado] = useState(false);
  const [panel, setPanel] = useState(true);

  const preview = doc.driveId
    ? `https://drive.google.com/file/d/${doc.driveId}/preview`
    : null;
  const descarga = doc.driveId
    ? `https://drive.google.com/uc?export=download&id=${doc.driveId}`
    : (doc.url ?? "#");
  const enDrive = doc.driveId ? `https://drive.google.com/file/d/${doc.driveId}/view` : doc.url;

  const ext = extDeArchivo(doc.fileName, doc.mimeType);
  const estilo = estiloExt(ext);

  // Esc cierra, como cualquier modal. Sin esto hay que ir a buscar el botón.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", onKey);
    // Se bloquea el desplazamiento de fondo: si no, la rueda mueve la lista de
    // detrás mientras se lee el documento.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
      className="kc-fade"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "var(--kc-navy)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Barra superior ──────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 18px",
          borderBottom: "1px solid rgba(255,255,255,.09)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onCerrar}
          className="kc-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.06)",
            color: "var(--kc-dk-1)",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "7px 12px",
            borderRadius: 9,
            flexShrink: 0,
          }}
        >
          <Icon name="back" size={12} />
          Biblioteca
        </button>

        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: estilo.soft,
            color: estilo.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {estilo.ext}
        </span>

        <span style={{ flex: 1, minWidth: 180 }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            {doc.code && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--kc-dk-3)" }}>
                {doc.code}
              </span>
            )}
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-.015em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {doc.title}
            </span>
          </span>
          <span style={{ display: "block", fontSize: 10.5, color: "var(--kc-dk-3)" }}>
            {[doc.author, tamano(doc.sizeBytes), `act. ${haceCuanto(doc.updatedAt)}`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>

        {/* Zoom. Solo tiene sentido cuando hay algo incrustado. */}
        {preview && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 9,
              padding: 2,
              flexShrink: 0,
            }}
          >
            <BotonBarra
              onClick={() => {
                setZoom((z) => Math.max(50, z - 10));
                setAjustado(false);
              }}
              titulo="Alejar"
            >
              −
            </BotonBarra>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--kc-dk-1)",
                minWidth: 42,
                textAlign: "center",
              }}
            >
              {ajustado ? "Ancho" : `${zoom}%`}
            </span>
            <BotonBarra
              onClick={() => {
                setZoom((z) => Math.min(200, z + 10));
                setAjustado(false);
              }}
              titulo="Acercar"
            >
              +
            </BotonBarra>
            <BotonBarra
              onClick={() => {
                setAjustado((v) => !v);
                setZoom(100);
              }}
              titulo="Ajustar al ancho"
              activo={ajustado}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" />
              </svg>
            </BotonBarra>
          </span>
        )}

        <span style={{ display: "flex", gap: 7, flexShrink: 0 }}>
          <a
            href={descarga}
            target="_blank"
            rel="noopener noreferrer"
            className="kc-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: "none",
              background: "var(--kc-green-solid)",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: 9,
              textDecoration: "none",
              boxShadow: "var(--kc-shadow-btn)",
            }}
          >
            <IconoDescarga />
            Descargar
          </a>

          {enDrive && (
            <a
              href={enDrive}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en Drive"
              className="kc-btn"
              style={botonIcono}
            >
              <IconoExterno />
              <span className="kc-sr">Abrir en Drive</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            title="Información del documento"
            aria-pressed={panel}
            className="kc-btn"
            style={{
              ...botonIcono,
              background: panel ? "rgba(50,214,107,.18)" : "rgba(255,255,255,.06)",
              color: panel ? "var(--kc-green)" : "var(--kc-dk-1)",
            }}
          >
            <IconoInfo />
            <span className="kc-sr">Información</span>
          </button>

          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="kc-btn"
            style={botonIcono}
          >
            <IconoCerrar />
            <span className="kc-sr">Cerrar</span>
          </button>
        </span>
      </header>

      {/* ── Documento + panel ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            background: "#0E2138",
          }}
        >
          {preview ? (
            <iframe
              src={preview}
              title={doc.title}
              allow="autoplay"
              style={{
                // `ajustado` ocupa todo el ancho; el zoom trabaja sobre un
                // ancho de página fijo, como haría un lector de PDF.
                width: ajustado ? "100%" : `${(zoom / 100) * 900}px`,
                maxWidth: "100%",
                height: "100%",
                minHeight: 0,
                border: "none",
                background: "#20304A",
                transition: "width .2s ease",
              }}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: 30,
                textAlign: "center",
              }}
            >
              <span style={{ color: "var(--kc-dk-3)" }}>
                <Icon name="lib" size={34} />
              </span>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
                {doc.url
                  ? "Este documento vive fuera del Centro"
                  : "El archivo todavía no está enlazado"}
              </p>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--kc-dk-2)",
                  margin: 0,
                  maxWidth: 400,
                  lineHeight: 1.55,
                }}
              >
                {doc.url
                  ? "No se puede incrustar aquí dentro, así que se abre en una pestaña nueva con tu cuenta de Sohersa."
                  : "La ficha existe en el cronograma, pero aún no tiene documento asociado. Avisa a Transformación Digital si crees que debería estar."}
              </p>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kc-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "11px 18px",
                    borderRadius: 11,
                    background: "var(--kc-green-solid)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 600,
                    textDecoration: "none",
                    boxShadow: "var(--kc-shadow-btn)",
                  }}
                >
                  Abrir documento
                </a>
              )}
            </div>
          )}
        </div>

        {/* Panel de información. */}
        {panel && (
          <aside
            className="kc-fade"
            style={{
              width: 280,
              flexShrink: 0,
              borderLeft: "1px solid rgba(255,255,255,.09)",
              padding: "18px 18px 24px",
              overflowY: "auto",
              background: "var(--kc-navy)",
            }}
          >
            <h2
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: ".14em",
                color: "var(--kc-dk-3)",
                margin: "0 0 14px",
              }}
            >
              INFORMACIÓN
            </h2>

            <Dato etiqueta="Código" valor={doc.code} />
            <Dato etiqueta="Sección" valor={doc.section} />
            <Dato etiqueta="Elaboró" valor={doc.author} />
            <Dato etiqueta="Archivo" valor={doc.fileName} />
            <Dato etiqueta="Tamaño" valor={tamano(doc.sizeBytes)} />
            <Dato etiqueta="Actualizado" valor={haceCuanto(doc.updatedAt)} />
            {doc.training && <Dato etiqueta="Capacitación" valor={doc.training} />}

            {/*
             * Los campos de gestión solo llegan a quien puede verlos: si están
             * presentes en el objeto, es que esta persona tiene permiso. El
             * filtro ya ocurrió en el servidor.
             */}
            {doc.priority !== undefined && (
              <>
                <div
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,.09)",
                    margin: "16px 0 14px",
                  }}
                />
                <h2
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: ".14em",
                    color: "var(--kc-faq-dot)",
                    margin: "0 0 12px",
                  }}
                >
                  SEGUIMIENTO INTERNO
                </h2>
                <Dato etiqueta="Prioridad" valor={doc.priority} />
                <Dato
                  etiqueta="Necesario para iniciar"
                  valor={doc.required ? "Sí" : "No"}
                />
                {typeof doc.progress === "number" && (
                  <Dato etiqueta="Avance" valor={`${Math.round(doc.progress * 100)}%`} />
                )}
                {doc.notes && <Dato etiqueta="Notas" valor={doc.notes} />}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

const botonIcono: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(255,255,255,.06)",
  color: "var(--kc-dk-1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  flexShrink: 0,
};

function BotonBarra({
  children,
  onClick,
  titulo,
  activo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  titulo: string;
  activo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-pressed={activo}
      className="kc-btn"
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        border: "none",
        background: activo ? "rgba(50,214,107,.2)" : "transparent",
        color: activo ? "var(--kc-green)" : "var(--kc-dk-1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {children}
      <span className="kc-sr">{titulo}</span>
    </button>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9.5, color: "var(--kc-dk-3)", marginBottom: 2 }}>{etiqueta}</div>
      <div style={{ fontSize: 12, color: "var(--kc-dk-1)", lineHeight: 1.5 }}>{valor}</div>
    </div>
  );
}

function IconoDescarga() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconoExterno() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
    </svg>
  );
}

function IconoInfo() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-5M12 8h.01" />
    </svg>
  );
}

function IconoCerrar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
