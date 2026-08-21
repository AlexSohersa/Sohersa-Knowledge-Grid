"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/layout/icons";
import { estiloExt } from "@/modules/shared/domain/conocimiento";
import { fuenteVideo, type Capacitacion, type Material, type Tema } from "@/modules/capacitaciones/domain/capacitacion";

/**
 * El explorador de material de una capacitación.
 *
 * SIN AVANCE: no hay "marcar visto", ni porcentaje, ni temario que se vaya
 * tachando. Alguien vino a ver un video o a bajar una presentación, y lo que
 * necesita es encontrarlo rápido y verlo bien.
 *
 * El video se reproduce arriba y el material del tema queda debajo, a la vista.
 * Cambiar de tema no recarga la página: todo está ya en memoria.
 */
export function ExploradorMaterial({ cap }: { cap: Capacitacion }) {
  const [indice, setIndice] = useState(0);
  const [viendo, setViendo] = useState<Material | null>(null);

  const tema = cap.temas[indice];
  const video = fuenteVideo(tema?.videoUrl);

  if (!tema) {
    return (
      <p
        className="kc-panel"
        style={{ padding: 30, textAlign: "center", color: "var(--kc-ink-3)" }}
      >
        Esta capacitación todavía no tiene material.
      </p>
    );
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* ── Video y material del tema ─────────────────────────────────── */}
        <div>
          <div
            className="kc-panel"
            style={{ overflow: "hidden", background: "#0A1728", borderColor: "transparent" }}
          >
            {video ? (
              video.tipo === "archivo" ? (
                <video
                  key={tema.id}
                  src={video.src}
                  controls
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    display: "block",
                    background: "#000",
                  }}
                />
              ) : (
                <iframe
                  key={tema.id}
                  src={video.src}
                  title={tema.title}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    border: "none",
                    display: "block",
                  }}
                />
              )
            ) : (
              <div
                style={{
                  aspectRatio: "16/9",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "var(--kc-dk-2)",
                }}
              >
                <Icon name="cap" size={30} />
                <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>
                  Este tema no tiene video
                </p>
                <p style={{ fontSize: 11.5, margin: 0, color: "var(--kc-dk-3)" }}>
                  {tema.materials.length > 0
                    ? "Su material está abajo."
                    : "Todavía no tiene material asociado."}
                </p>
              </div>
            )}
          </div>

          {/* Encabezado del tema y su material. */}
          <div className="kc-panel" style={{ padding: "16px 18px", marginTop: 14 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--kc-ink-4)" }}>
              TEMA {tema.code} · {tema.kind}
              {tema.duration ? ` · ${tema.duration}` : ""}
            </span>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--kc-ink)",
                margin: "4px 0 0",
                letterSpacing: "-.022em",
              }}
            >
              {tema.title}
            </h2>
            {tema.summary && (
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--kc-ink-2)",
                  margin: "8px 0 0",
                  lineHeight: 1.55,
                }}
              >
                {tema.summary}
              </p>
            )}

            {tema.materials.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #EDF2F7" }}>
                <p
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: ".12em",
                    color: "#A9B7C6",
                    margin: "0 0 9px",
                  }}
                >
                  MATERIAL DE ESTE TEMA
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {tema.materials.map((m) => (
                    <FilaMaterial key={m.id} material={m} onVer={() => setViendo(m)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navegación entre temas: adelante y atrás, sin marcar nada. */}
          {cap.temas.length > 1 && (
            <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setIndice((i) => Math.max(0, i - 1))}
                disabled={indice === 0}
                className="kc-btn"
                style={{
                  ...botonNav,
                  opacity: indice === 0 ? 0.4 : 1,
                  cursor: indice === 0 ? "not-allowed" : "pointer",
                }}
              >
                <Icon name="back" size={12} />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setIndice((i) => Math.min(cap.temas.length - 1, i + 1))}
                disabled={indice === cap.temas.length - 1}
                className="kc-btn"
                style={{
                  ...botonNav,
                  marginLeft: "auto",
                  opacity: indice === cap.temas.length - 1 ? 0.4 : 1,
                  cursor: indice === cap.temas.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                Siguiente
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* ── Contenido de la capacitación ──────────────────────────────── */}
        <aside className="kc-panel kc-sticky" style={{ padding: "14px 13px" }}>
          <div style={{ marginBottom: 11 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--kc-ink)" }}>
              Contenido
            </span>
            <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)", marginLeft: 6 }}>
              {cap.temas.length} {cap.temas.length === 1 ? "tema" : "temas"}
            </span>
          </div>

          <nav
            aria-label="Temas de la capacitación"
            style={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            {cap.temas.map((t, i) => (
              <BotonTema
                key={t.id}
                tema={t}
                actual={i === indice}
                onClick={() => setIndice(i)}
              />
            ))}
          </nav>
        </aside>
      </div>

      {viendo && <VisorMaterial material={viendo} onCerrar={() => setViendo(null)} />}
    </>
  );
}

const botonNav: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink)",
  fontSize: 12,
  fontWeight: 600,
  padding: "9px 14px",
  borderRadius: 10,
};

function BotonTema({
  tema,
  actual,
  onClick,
}: {
  tema: Tema;
  actual: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={actual ? "true" : undefined}
      className="kc-row-h"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        padding: "9px 10px",
        borderRadius: 10,
        border: actual ? "1px solid rgba(50,214,107,.4)" : "1px solid transparent",
        background: actual ? "var(--kc-cap-soft)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        fontFamily: "var(--kc-font)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 21,
          height: 21,
          borderRadius: 6,
          background: actual ? "var(--kc-green)" : "#EDF2F7",
          color: actual ? "#fff" : "var(--kc-ink-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {tema.code}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: actual ? 600 : 500,
            color: "var(--kc-ink)",
            lineHeight: 1.35,
          }}
        >
          {tema.title}
        </span>
        <span style={{ fontSize: 10, color: "var(--kc-ink-4)" }}>
          {[
            tema.videoUrl ? "Video" : tema.kind,
            tema.duration,
            tema.materials.length > 0
              ? `${tema.materials.length} ${tema.materials.length === 1 ? "doc" : "docs"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </button>
  );
}

/** Una fila de material: se ve dentro o se descarga. */
function FilaMaterial({ material, onVer }: { material: Material; onVer: () => void }) {
  const est = estiloExt(material.kind);
  const url =
    material.url ??
    (material.driveId ? `https://drive.google.com/file/d/${material.driveId}/view` : null);
  // Se puede incrustar si vive en Drive o si es un Canva, que también admite
  // vista incrustada.
  const incrustable = Boolean(material.driveId) || Boolean(material.url?.includes("canva.com"));

  return (
    <div
      className="kc-row-h"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 11px",
        border: "1px solid var(--kc-line)",
        borderRadius: 10,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: est.soft,
          color: est.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {est.ext}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--kc-ink)" }}
        >
          {material.title}
        </span>
        {material.sizeText && (
          <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>{material.sizeText}</span>
        )}
      </span>

      {incrustable && (
        <button
          type="button"
          onClick={onVer}
          className="kc-btn"
          style={botonMaterial}
          title="Ver aquí"
        >
          Ver
        </button>
      )}

      {url && material.downloadable && (
        <a
          href={
            material.driveId
              ? `https://drive.google.com/uc?export=download&id=${material.driveId}`
              : url
          }
          target="_blank"
          rel="noopener noreferrer"
          className="kc-btn"
          style={{ ...botonMaterial, textDecoration: "none" }}
          title="Descargar"
        >
          Descargar
        </a>
      )}
    </div>
  );
}

const botonMaterial: React.CSSProperties = {
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink-2)",
  fontSize: 11,
  fontWeight: 600,
  padding: "6px 11px",
  borderRadius: 8,
  flexShrink: 0,
  whiteSpace: "nowrap",
};

/**
 * El visor de un material: PDF, presentación o Canva a pantalla completa.
 *
 * Mismo marco navy que el visor de la biblioteca, para que abrir un documento
 * se sienta igual venga de donde venga.
 */
function VisorMaterial({ material, onCerrar }: { material: Material; onCerrar: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  const src = material.driveId
    ? `https://drive.google.com/file/d/${material.driveId}/preview`
    : // Canva expone su vista incrustada cambiando el sufijo del enlace.
      (material.url?.replace(/\/(edit|view).*$/, "/view?embed") ?? null);

  const est = estiloExt(material.kind);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={material.title}
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
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 18px",
          borderBottom: "1px solid rgba(255,255,255,.09)",
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: est.soft,
            color: est.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {est.ext}
        </span>

        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13.5,
            fontWeight: 700,
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {material.title}
        </span>

        {material.downloadable && (material.driveId || material.url) && (
          <a
            href={
              material.driveId
                ? `https://drive.google.com/uc?export=download&id=${material.driveId}`
                : (material.url ?? "#")
            }
            target="_blank"
            rel="noopener noreferrer"
            className="kc-btn"
            style={{
              border: "none",
              background: "var(--kc-green-solid)",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: 9,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Descargar
          </a>
        )}

        <button
          type="button"
          onClick={onCerrar}
          title="Cerrar (Esc)"
          className="kc-btn"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,.14)",
            background: "rgba(255,255,255,.06)",
            color: "var(--kc-dk-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
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
          <span className="kc-sr">Cerrar</span>
        </button>
      </header>

      {src ? (
        <iframe
          src={src}
          title={material.title}
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{ flex: 1, width: "100%", border: "none", background: "#20304A" }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--kc-dk-2)",
            fontSize: 13,
          }}
        >
          Este material no se puede mostrar aquí dentro.
        </div>
      )}
    </div>
  );
}
