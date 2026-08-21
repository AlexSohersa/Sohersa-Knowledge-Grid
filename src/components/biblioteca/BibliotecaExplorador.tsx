"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/layout/icons";
import { estiloExt, extDeArchivo } from "@/modules/shared/domain/conocimiento";
import { haceCuanto, tamano } from "@/modules/shared/domain/formato";
import type { Documento, SeccionDocumentos } from "@/modules/biblioteca/domain/documento";
import {
  coincide,
  estadoDocumento,
  estiloEstado,
  etiquetaEstado,
} from "@/modules/biblioteca/domain/documento";
import { VisorDocumento } from "./VisorDocumento";
import { alternarGuardado } from "@/app/(app)/acciones-personales";

/**
 * El explorador de la biblioteca: secciones a la izquierda, documentos a la
 * derecha, y el visor a pantalla completa al abrir uno.
 *
 * Es cliente porque elegir sección, filtrar y abrir el visor son interacciones
 * que no merecen un viaje al servidor: los documentos ya están todos en memoria
 * —son decenas, no miles— y responder al instante hace que explorar se sienta
 * como hojear, que es justo lo que la gente hace aquí.
 *
 * El filtrado por permisos ya ocurrió en el servidor: lo que llega es lo que
 * esta persona puede ver.
 */
export function BibliotecaExplorador({
  secciones,
  guardados,
}: {
  secciones: SeccionDocumentos[];
  /** Códigos de los documentos que esta persona tiene guardados. */
  guardados: string[];
}) {
  const [seccionActiva, setSeccionActiva] = useState(0);
  const [q, setQ] = useState("");
  const [viendo, setViendo] = useState<Documento | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(guardados));

  const seccion = secciones[seccionActiva] ?? secciones[0];
  const buscando = q.trim().length > 0;

  /*
   * Al buscar se recorre TODA la biblioteca, no solo la sección abierta: quien
   * escribe "nomenclatura" quiere encontrarla esté donde esté, y obligarle a
   * adivinar la sección haría el buscador inútil.
   */
  const documentos = useMemo(() => {
    if (!buscando) return seccion?.items ?? [];
    return secciones.flatMap((s) => s.items).filter((d) => coincide(d, q));
  }, [buscando, q, seccion, secciones]);

  /** Las secciones agrupadas por su grupo del cronograma. */
  const grupos = useMemo(() => {
    const mapa = new Map<string, { name: string; indice: number; total: number }[]>();
    secciones.forEach((s, i) => {
      const grupo = grupoDeSeccion(s.name);
      const lista = mapa.get(grupo) ?? [];
      lista.push({ name: s.name, indice: i, total: s.items.length });
      mapa.set(grupo, lista);
    });
    return [...mapa.entries()].map(([grupo, secs]) => ({ grupo, secs }));
  }, [secciones]);

  async function alternar(doc: Documento) {
    const clave = doc.code ?? doc.id;
    const estaba = marcados.has(clave);

    // Se pinta antes de que responda el servidor: guardar casi nunca falla y
    // esperar medio segundo hace que la interfaz se sienta lenta.
    setMarcados((prev) => {
      const copia = new Set(prev);
      if (estaba) copia.delete(clave);
      else copia.add(clave);
      return copia;
    });

    try {
      await alternarGuardado("doc", clave, doc.title);
    } catch {
      // Se revierte: un marcador relleno que no se guardó sería mentir.
      setMarcados((prev) => {
        const copia = new Set(prev);
        if (estaba) copia.add(clave);
        else copia.delete(clave);
        return copia;
      });
    }
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "256px minmax(0,1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ── Navegación de secciones ───────────────────────────────────── */}
        <div
          className="kc-panel kc-rise kc-sticky"
          style={{ padding: "12px 10px" }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--kc-line)",
              borderRadius: 10,
              padding: "0 10px",
              height: 34,
              marginBottom: 12,
              background: "#F8FAFC",
              cursor: "text",
            }}
          >
            <span style={{ color: "var(--kc-ink-4)", display: "flex" }}>
              <Icon name="search" size={13} />
            </span>
            <span className="kc-sr">Filtrar documentos</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Título, autor o código…"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "var(--kc-font)",
                fontSize: 11.5,
                color: "var(--kc-ink)",
              }}
            />
          </label>

          <nav
            aria-label="Secciones de la biblioteca"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              /*
               * La altura se deriva del viewport, no de un número fijo: con un
               * `maxHeight` cerrado el panel se cortaba en pantallas bajas y
               * dejaba hueco muerto en las altas. Se descuentan la barra
               * superior, el margen del sticky y lo que ocupa el buscador de
               * arriba, así el scroll interno solo aparece cuando de verdad no
               * cabe la lista.
               */
              maxHeight: "calc(100dvh - var(--kc-topbar) - 120px)",
              overflowY: "auto",
            }}
          >
            {grupos.map((g) => (
              <div key={g.grupo} style={{ marginBottom: 6 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: ".12em",
                    color: "#A9B7C6",
                    padding: "6px 9px 3px",
                  }}
                >
                  {g.grupo}
                </span>
                {g.secs.map((s) => {
                  const activa = !buscando && s.indice === seccionActiva;
                  return (
                    <button
                      key={s.indice}
                      type="button"
                      onClick={() => {
                        setSeccionActiva(s.indice);
                        setQ("");
                      }}
                      className="kc-row-h"
                      aria-current={activa ? "true" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 9px",
                        borderRadius: 9,
                        cursor: "pointer",
                        background: activa ? "var(--kc-cap-soft)" : "transparent",
                        border: "none",
                        width: "100%",
                        textAlign: "left",
                        fontFamily: "var(--kc-font)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: colorDeGrupo(g.grupo),
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 11.5,
                          fontWeight: activa ? 600 : 400,
                          color: activa ? "var(--kc-green-ink)" : "var(--kc-ink-2)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.name}
                      </span>
                      <span style={{ fontSize: 9.5, color: "var(--kc-ink-4)", flexShrink: 0 }}>
                        {s.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* ── Documentos ────────────────────────────────────────────────── */}
        <div className="kc-rise" style={{ animationDelay: ".05s" }}>
          {/* Migas: dónde estoy dentro de la biblioteca. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 11,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--kc-ink-3)" }}>Biblioteca</span>
            <Chevron />
            <span style={{ fontSize: 11, color: "var(--kc-ink-3)" }}>
              {buscando ? "Búsqueda" : grupoDeSeccion(seccion?.name ?? "")}
            </span>
            <Chevron />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--kc-ink)" }}>
              {buscando ? `“${q}”` : seccion?.name}
            </span>
          </div>

          <div className="kc-panel" style={{ overflow: "hidden" }}>
            <div
              style={{
                borderBottom: "1px solid #EDF2F7",
                padding: "14px 17px",
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ flex: 1, minWidth: 200 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 15.5,
                    fontWeight: 700,
                    letterSpacing: "-.022em",
                    color: "var(--kc-ink)",
                  }}
                >
                  {buscando ? "Resultados" : seccion?.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    color: "var(--kc-ink-3)",
                    marginTop: 2,
                  }}
                >
                  {buscando
                    ? `Coincidencias en toda la biblioteca para “${q}”`
                    : descripcionDeSeccion(seccion?.name ?? "")}
                </span>
              </span>
              <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)", whiteSpace: "nowrap" }}>
                {documentos.length} {documentos.length === 1 ? "documento" : "documentos"}
              </span>
            </div>

            {documentos.length === 0 ? (
              <p
                style={{
                  padding: "34px 20px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--kc-ink-3)",
                  margin: 0,
                }}
              >
                {buscando
                  ? "Ningún documento coincide con esa búsqueda."
                  : "Esta sección todavía no tiene documentos."}
              </p>
            ) : (
              <div>
                {documentos.map((d) => (
                  <FilaDocumento
                    key={d.id}
                    doc={d}
                    mostrarSeccion={buscando}
                    guardado={marcados.has(d.code ?? d.id)}
                    onGuardar={() => alternar(d)}
                    onAbrir={() => setViendo(d)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* La nota de permisos: explica por qué alguien puede ver menos
              documentos que su compañero, antes de que lo pregunte. */}
          <p
            style={{
              fontSize: 11,
              color: "var(--kc-ink-4)",
              margin: "14px 0 0",
              textAlign: "center",
            }}
          >
            Ves únicamente los archivos que tu cuenta de Google ya puede consultar. El
            Centro hereda permisos, no los amplía.
          </p>
        </div>
      </div>

      {viendo && <VisorDocumento doc={viendo} onCerrar={() => setViendo(null)} />}
    </>
  );
}

/** Una fila de documento, con sus acciones a la derecha. */
function FilaDocumento({
  doc,
  mostrarSeccion,
  guardado,
  onGuardar,
  onAbrir,
}: {
  doc: Documento;
  mostrarSeccion: boolean;
  guardado: boolean;
  onGuardar: () => void;
  onAbrir: () => void;
}) {
  const ext = extDeArchivo(doc.fileName, doc.mimeType);
  const estilo = estiloExt(ext);
  const estado = estadoDocumento(doc);
  const estiloEst = estiloEstado(estado);
  const descarga = doc.driveId
    ? `https://drive.google.com/uc?export=download&id=${doc.driveId}`
    : doc.url;

  return (
    <div
      className="kc-row-h"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "12px 17px",
        borderTop: "1px solid #F1F5F9",
      }}
    >
      {/* El cuerpo de la fila abre el visor. Es un botón y no un enlace porque
          el visor es un modal: no cambia de página. */}
      <button
        type="button"
        onClick={onAbrir}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 13,
          border: "none",
          background: "transparent",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "var(--kc-font)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: estilo.soft,
            color: estilo.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: ".04em",
          }}
        >
          {estilo.ext}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            {doc.code && (
              <span style={{ fontSize: 9.5, color: "var(--kc-ink-4)", fontWeight: 600 }}>
                {doc.code}
              </span>
            )}
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--kc-ink)",
                letterSpacing: "-.012em",
              }}
            >
              {doc.title}
            </span>
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11,
              color: "var(--kc-ink-3)",
              marginTop: 3,
              flexWrap: "wrap",
            }}
          >
            {doc.author && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Avatar nombre={doc.author} />
                {doc.author}
              </span>
            )}
            <span>{tamano(doc.sizeBytes)}</span>
            <span>act. {haceCuanto(doc.updatedAt)}</span>
            {mostrarSeccion && <span>· {doc.section}</span>}
            {doc.training && doc.training !== "N/A" && (
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: "var(--kc-tool-ink)",
                  background: "var(--kc-tool-soft)",
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                {doc.training}
              </span>
            )}
          </span>
        </span>
      </button>

      {/* El estado de elaboración solo lo ve quien puede ver los campos de
          gestión: si `priority` llegó, es que tiene permiso. */}
      {doc.priority !== undefined && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: estiloEst.ink,
            background: estiloEst.soft,
            borderRadius: 6,
            padding: "4px 9px",
            flexShrink: 0,
          }}
        >
          {etiquetaEstado(estado)}
        </span>
      )}

      <span style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <BotonFila
          onClick={onGuardar}
          titulo={guardado ? "Quitar de guardados" : "Guardar"}
          activo={guardado}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill={guardado ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </BotonFila>

        <BotonFila onClick={onAbrir} titulo="Ver documento">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </BotonFila>

        {descarga && (
          <a
            href={descarga}
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar"
            className="kc-btn"
            style={estiloBotonFila(false)}
            onClick={(e) => e.stopPropagation()}
          >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span className="kc-sr">Descargar</span>
          </a>
        )}
      </span>
    </div>
  );
}

function estiloBotonFila(activo: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: `1px solid ${activo ? "rgba(245,184,67,.55)" : "var(--kc-line)"}`,
    background: activo ? "var(--kc-faq-soft)" : "#fff",
    color: activo ? "var(--kc-faq-ink)" : "var(--kc-ink-3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    textDecoration: "none",
  };
}

function BotonFila({
  children,
  onClick,
  titulo,
  activo = false,
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
      style={estiloBotonFila(activo)}
    >
      {children}
      <span className="kc-sr">{titulo}</span>
    </button>
  );
}

/** El avatar circular con las iniciales de quien elaboró el documento. */
function Avatar({ nombre }: { nombre: string }) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const ini =
    partes.length >= 2
      ? (partes[0][0] + partes[1][0]).toUpperCase()
      : nombre.slice(0, 2).toUpperCase();

  // Color determinista: la misma persona tiene siempre el mismo, sin guardarlo.
  const COLORES = ["#32D66B", "#39B8B4", "#8B7CF6", "#3E7FA6", "#F5B843", "#E8825E"];
  let suma = 0;
  for (let i = 0; i < nombre.length; i++) suma = (suma + nombre.charCodeAt(i)) % 997;

  return (
    <span
      aria-hidden="true"
      style={{
        width: 17,
        height: 17,
        borderRadius: "50%",
        background: COLORES[suma % COLORES.length],
        color: "#fff",
        fontSize: 7.5,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {ini}
    </span>
  );
}

function Chevron() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C8D6E2"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * A qué grupo del cronograma pertenece una sección.
 *
 * El grupo no está en la base: el cronograma lo expresa en el propio nombre de
 * la sección. Se infiere aquí para poder agrupar el menú lateral como en el
 * diseño, sin pedirle al equipo que capture un campo más.
 */
function grupoDeSeccion(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("instructivo") || n.includes("manual")) return "Manuales e instructivos";
  if (n.includes("estándar") || n.includes("estandar") || n.includes("calidad"))
    return "Estándares";
  if (n.includes("familia") || n.includes("plantilla")) return "Recursos técnicos";
  if (n.includes("capacitac") || n.includes("grabacion") || n.includes("grabación"))
    return "Capacitaciones";
  if (n.includes("dynamo") || n.includes("automatiza")) return "Automatización";
  return "Otros";
}

/** Una línea que explica de qué va la sección, como en el diseño. */
function descripcionDeSeccion(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("revit") || n.includes("software"))
    return "Guías paso a paso para modelado y flujos de software.";
  if (n.includes("acc") || n.includes("colabora"))
    return "Autodesk Construction Cloud: cuentas, carpetas y flujos.";
  if (n.includes("estándar") || n.includes("estandar") || n.includes("calidad"))
    return "Criterios mínimos que debe cumplir todo entregable.";
  if (n.includes("familia")) return "Familias paramétricas listas para usar en proyectos.";
  if (n.includes("plantilla")) return "Arranque de proyectos y documentos corporativos.";
  if (n.includes("presentacion") || n.includes("presentación"))
    return "Material de apoyo de cada sesión impartida.";
  if (n.includes("grabacion") || n.includes("grabación"))
    return "Videos de las sesiones para consultar a tu ritmo.";
  if (n.includes("dynamo") || n.includes("automatiza"))
    return "Documentación de scripts y paquetes internos.";
  return "Documentos vigentes de esta sección.";
}

/** El color del punto de cada grupo, del lenguaje visual del diseño. */
function colorDeGrupo(grupo: string): string {
  return (
    {
      "Manuales e instructivos": "#32D66B",
      Estándares: "#8B7CF6",
      "Recursos técnicos": "#3E7FA6",
      Capacitaciones: "#F5B843",
      Automatización: "#8B7CF6",
      Otros: "#39B8B4",
    }[grupo] ?? "#39B8B4"
  );
}
