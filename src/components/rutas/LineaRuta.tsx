"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/layout/icons";
import { estiloExt } from "@/modules/shared/domain/conocimiento";
import {
  avanceItem,
  estiloEtapa,
  itemCompleto,
  type EstadoEtapa,
  type ItemRuta,
  type Ruta,
  type TemaRuta,
} from "@/modules/rutas/domain/ruta";
import { marcarOrigen } from "@/modules/shared/domain/procedencia";
import { marcarAvance, registrarDescarga } from "@/app/(app)/ruta/acciones";

/**
 * La línea de tiempo de la ruta.
 *
 * Aquí SÍ hay seguimiento, y es lo que distingue esta pantalla de la biblioteca
 * de capacitaciones: cada elemento se marca, cada descarga queda registrada y
 * el porcentaje sube en tiempo real.
 *
 * La línea vertical con los nodos es lo que convierte la lista en un camino: se
 * ve de dónde vienes, dónde estás y qué queda cerrado más adelante.
 */
export function LineaRuta({
  ruta,
  estados,
}: {
  ruta: Ruta;
  estados: EstadoEtapa[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {ruta.etapas.map((etapa, i) => {
        const estado = estados[i];
        const bloqueada = estado === "bloqueada";
        const est = estiloEtapa(estado);
        const hechos = etapa.items.filter(itemCompleto).length;
        const ultima = i === ruta.etapas.length - 1;

        return (
          <section
            key={etapa.id}
            /* El ancla a la que vuelve el botón de regresar de una ficha. */
            id={`etapa-${etapa.id}`}
            className="kc-rise"
            style={{ display: "flex", gap: 16, animationDelay: `${i * 0.06}s` }}
          >
            {/* El raíl vertical con el nodo de la etapa. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
                width: 34,
              }}
            >
              <NodoEtapa estado={estado} numero={i + 1} />
              {!ultima && (
                <span
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    width: 2,
                    minHeight: 40,
                    background:
                      estado === "completa"
                        ? "var(--kc-green)"
                        : "linear-gradient(180deg,#DDE5EE,#EDF2F7)",
                    marginTop: 4,
                  }}
                />
              )}
            </div>

            {/* El contenido de la etapa. */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: ultima ? 0 : 26 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: ".1em",
                    color: "var(--kc-ink-4)",
                  }}
                >
                  {etapa.code.toUpperCase()}
                </span>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: bloqueada ? "var(--kc-ink-3)" : "var(--kc-ink)",
                    margin: 0,
                    letterSpacing: "-.024em",
                  }}
                >
                  {etapa.name}
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: est.ink,
                    background: est.soft,
                    borderRadius: 6,
                    padding: "3px 9px",
                  }}
                >
                  {estado === "completa"
                    ? "Etapa completada"
                    : bloqueada
                      ? "Bloqueada"
                      : `${hechos} de ${etapa.items.length}`}
                </span>
              </div>

              {etapa.description && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--kc-ink-3)",
                    margin: "0 0 12px",
                    lineHeight: 1.5,
                  }}
                >
                  {etapa.description}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {etapa.items.map((item) => (
                  <TarjetaItem
                    key={item.id}
                    item={item}
                    pathId={ruta.id}
                    etapaId={etapa.id}
                    bloqueada={bloqueada}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** El nodo del raíl: círculo verde con palomita, aro vivo o candado. */
function NodoEtapa({ estado, numero }: { estado: EstadoEtapa; numero: number }) {
  if (estado === "completa") {
    return (
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--kc-green)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Palomita size={15} />
      </span>
    );
  }

  if (estado === "en_curso") {
    // El aro con el punto dentro: la señal de "estás aquí".
    return (
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--kc-navy-soft)",
          border: "2px solid var(--kc-green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--kc-green)",
          }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: "#EDF2F7",
        color: "#A9B7C6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <Icon name="lock" size={13} />
      <span className="kc-sr">Etapa {numero} bloqueada</span>
    </span>
  );
}

/**
 * Un elemento de la ruta.
 *
 * Si es una capacitación con temas, se despliega para marcarlos uno a uno —es
 * el "paso a paso" que hace que el avance signifique algo—. Si es un documento,
 * se marca de una pieza.
 */
function TarjetaItem({
  item,
  pathId,
  etapaId,
  bloqueada,
}: {
  item: ItemRuta;
  pathId: string;
  etapaId: string;
  bloqueada: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [temas, setTemas] = useState<TemaRuta[]>(item.temas);
  const [propio, setPropio] = useState(item.completado);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const conTemas = temas.length > 0;
  const completo = conTemas ? temas.every((t) => t.completado) : propio;
  const avance = avanceItem({ ...item, temas, completado: propio });

  /*
   * El destino lleva colgado de dónde sale.
   *
   * Sin esto, el botón de volver de la ficha devuelve a la biblioteca o a
   * capacitaciones —su sección— y se pierde la etapa que se estaba
   * recorriendo. `ref` guarda ruta y etapa para volver al punto exacto.
   */
  const ficha = item.trainingId
    ? `/capacitaciones/${item.trainingId}`
    : item.resourceCode
      ? `/biblioteca/${encodeURIComponent(item.resourceCode)}`
      : null;
  const destino = ficha ? marcarOrigen(ficha, "ruta", `${pathId}:${etapaId}`) : null;

  function marcarTema(tema: TemaRuta) {
    if (bloqueada) return;
    const previo = tema.completado;

    // Se pinta antes de que responda el servidor: marcar casi nunca falla y
    // esperar rompe el ritmo de ver-marcar-siguiente.
    setTemas((ts) =>
      ts.map((t) => (t.id === tema.id ? { ...t, completado: !previo } : t)),
    );
    setError(null);

    iniciar(async () => {
      const res = await marcarAvance(pathId, item.id, tema.id, !previo);
      if (!res.ok) {
        setTemas((ts) =>
          ts.map((t) => (t.id === tema.id ? { ...t, completado: previo } : t)),
        );
        setError(res.error ?? "No se pudo guardar tu avance.");
      }
    });
  }

  function marcarItem() {
    if (bloqueada) return;
    const previo = propio;
    setPropio(!previo);
    setError(null);

    iniciar(async () => {
      const res = await marcarAvance(pathId, item.id, null, !previo);
      if (!res.ok) {
        setPropio(previo);
        setError(res.error ?? "No se pudo guardar tu avance.");
      }
    });
  }

  function anotarDescarga(topicId: string | null) {
    // No se espera ni se avisa: la descarga ya está ocurriendo y el registro es
    // secundario.
    void registrarDescarga(pathId, item.id, topicId);
  }

  return (
    <div
      className="kc-panel"
      style={{
        overflow: "hidden",
        opacity: bloqueada ? 0.62 : 1,
        borderColor: completo ? "rgba(50,214,107,.4)" : "var(--kc-line)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 16px",
          background: completo ? "#FBFEFC" : "#fff",
        }}
      >
        {/* La casilla de completado. Para capacitaciones con temas no se puede
            pulsar: se completa marcando sus temas, que es el trabajo real. */}
        <button
          type="button"
          onClick={conTemas ? () => setAbierto((v) => !v) : marcarItem}
          disabled={bloqueada || pendiente}
          title={
            bloqueada
              ? "Termina la etapa anterior para desbloquear"
              : conTemas
                ? "Ver los temas"
                : completo
                  ? "Marcar como pendiente"
                  : "Marcar como hecho"
          }
          className="kc-btn"
          style={{
            width: 26,
            height: 26,
            borderRadius: conTemas ? 8 : "50%",
            border: completo ? "none" : "1.5px solid var(--kc-line-2)",
            background: completo ? "var(--kc-green)" : "#fff",
            color: completo ? "#fff" : "var(--kc-ink-4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: bloqueada ? "not-allowed" : "pointer",
          }}
        >
          {bloqueada ? (
            <Icon name="lock" size={12} />
          ) : completo ? (
            <Palomita size={13} />
          ) : conTemas ? (
            <IconoPlay />
          ) : null}
        </button>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: completo ? "var(--kc-ink-3)" : "var(--kc-ink)",
            }}
          >
            {item.title}
          </span>
          <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>
            {[
              item.trainingId ? "Capacitación" : "Documento",
              item.duration,
              conTemas ? `${avance.hechos} de ${avance.total} temas` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>

        {/* Barra corta de avance, cuando hay temas. */}
        {conTemas && !bloqueada && (
          <span style={{ width: 74, flexShrink: 0 }}>
            <span
              style={{
                display: "block",
                height: 4,
                borderRadius: 20,
                background: "#EDF2F7",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${avance.pct}%`,
                  height: "100%",
                  background: completo ? "var(--kc-green)" : "var(--kc-teal)",
                  borderRadius: 20,
                  transition: "width .35s cubic-bezier(.22,1,.36,1)",
                }}
              />
            </span>
          </span>
        )}

        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: completo ? "var(--kc-cap-ink)" : bloqueada ? "#A9B7C6" : "var(--kc-tool-ink)",
            background: completo
              ? "var(--kc-cap-soft)"
              : bloqueada
                ? "#EDF2F7"
                : "var(--kc-tool-soft)",
            borderRadius: 6,
            padding: "4px 9px",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {completo
            ? "Completado"
            : bloqueada
              ? "Bloqueado"
              : avance.hechos > 0
                ? "En progreso"
                : "Pendiente"}
        </span>

        {conTemas && !bloqueada && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="kc-btn"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              border: "none",
              background: "transparent",
              color: "var(--kc-ink-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transform: abierto ? "rotate(90deg)" : "none",
              transition: "transform .2s",
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
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="kc-sr">{abierto ? "Ocultar temas" : "Ver temas"}</span>
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            fontSize: 11,
            color: "#C23840",
            margin: 0,
            padding: "0 16px 10px 54px",
          }}
        >
          {error}
        </p>
      )}

      {/* Los temas, paso a paso. */}
      {abierto && !bloqueada && conTemas && (
        <div className="kc-fade" style={{ borderTop: "1px solid #F1F5F9" }}>
          {temas.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 11,
                padding: "10px 16px 10px 20px",
                borderTop: "1px solid #F7FAFC",
              }}
            >
              <button
                type="button"
                onClick={() => marcarTema(t)}
                disabled={pendiente}
                title={t.completado ? "Marcar como pendiente" : "Marcar como visto"}
                className="kc-btn"
                style={{
                  width: 21,
                  height: 21,
                  borderRadius: "50%",
                  border: t.completado ? "none" : "1.5px solid var(--kc-line-2)",
                  background: t.completado ? "var(--kc-green)" : "#fff",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {t.completado && <Palomita size={11} />}
              </button>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: t.completado ? "var(--kc-ink-3)" : "var(--kc-ink)",
                    lineHeight: 1.4,
                  }}
                >
                  {t.code}. {t.title}
                </span>
                <span style={{ fontSize: 10, color: "var(--kc-ink-4)" }}>
                  {[t.kind, t.duration, t.descargado ? "material descargado" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>

              {/* El material del tema, descargable desde la propia ruta. */}
              {t.materiales.length > 0 && (
                <span style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap" }}>
                  {t.materiales.map((m) => {
                    const est = estiloExt(m.kind);
                    const url = m.driveId
                      ? `https://drive.google.com/uc?export=download&id=${m.driveId}`
                      : m.url;
                    if (!url) return null;

                    return (
                      <a
                        key={m.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => anotarDescarga(t.id)}
                        title={`Descargar ${m.title}`}
                        className="kc-btn"
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: est.ink,
                          background: est.soft,
                          borderRadius: 6,
                          padding: "4px 8px",
                          textDecoration: "none",
                          border: "none",
                        }}
                      >
                        {est.ext}
                      </a>
                    );
                  })}
                </span>
              )}
            </div>
          ))}

          {destino && (
            <div style={{ padding: "10px 16px 13px 20px", borderTop: "1px solid #F7FAFC" }}>
              <Link
                href={destino}
                className="kc-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  border: "1px solid var(--kc-line)",
                  background: "#fff",
                  color: "var(--kc-ink)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "7px 13px",
                  borderRadius: 9,
                  textDecoration: "none",
                }}
              >
                <IconoPlay />
                Abrir la capacitación
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Documentos: enlace directo, sin desplegar. */}
      {!conTemas && !bloqueada && destino && (
        <div
          style={{
            padding: "9px 16px 12px 54px",
            borderTop: "1px solid #F7FAFC",
            display: "flex",
            gap: 8,
          }}
        >
          <Link
            href={destino}
            onClick={() => anotarDescarga(null)}
            className="kc-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink)",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "7px 13px",
              borderRadius: 9,
              textDecoration: "none",
            }}
          >
            Abrir documento
          </Link>
          {item.descargado && (
            <span
              style={{
                fontSize: 10.5,
                color: "var(--kc-cap-ink)",
                alignSelf: "center",
              }}
            >
              Ya lo consultaste
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Palomita({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function IconoPlay() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
