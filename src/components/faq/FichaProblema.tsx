"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/layout/icons";
import type { Faq } from "@/modules/faq/domain/faq";
import type { Comentario } from "@/modules/faq/application/ports";
import { votarFaq } from "@/app/(app)/faq/acciones";

/**
 * La ficha de un problema, con el orden que fija el borrador.
 *
 * El bloque más grande es la CAPTURA DEL ERROR, y no por estética: reconocer la
 * pantalla propia confirma que se llegó al sitio correcto antes de leer una
 * sola palabra. Cuando la ficha no tiene captura —27 de las 78 todavía no la
 * tienen— el bloque sencillamente no se pinta; dejar un hueco gris diciendo
 * «sin imagen» ocuparía el mejor sitio de la pantalla para no decir nada.
 *
 * La solución alternativa va plegada: se lee solo si la primera no funcionó, y
 * mostrarla abierta haría dudar de cuál de las dos es la buena.
 */
export function FichaProblema({
  faq,
  comentarios = [],
}: {
  faq: Faq;
  /** Los comentarios que el área ya aceptó para esta ficha. */
  comentarios?: Comentario[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 264px",
        gap: 20,
        alignItems: "start",
      }}
    >
      <article className="kc-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
          <Campo etiqueta="CÓDIGO FAQ">
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".05em",
                color: "var(--kc-faq-ink)",
                background: "var(--kc-faq-soft)",
                border: "1px solid rgba(176,124,16,.25)",
                borderRadius: 8,
                padding: "6px 12px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {faq.code ?? "FAQ"}
            </span>
          </Campo>

          <Campo etiqueta="TÍTULO DEL PROBLEMA">
            <h1
              style={{
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "-.026em",
                color: "var(--kc-ink)",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {faq.question}
            </h1>
          </Campo>

          {faq.symptom && (
            <Campo etiqueta="SÍNTOMA">
              <p style={{ fontSize: 13, color: "var(--kc-ink-2)", margin: 0, lineHeight: 1.6 }}>
                {faq.symptom}
              </p>
            </Campo>
          )}

          {faq.errorMessage && <MensajeError texto={faq.errorMessage} />}

          {faq.imageDriveId && (
            <Captura driveId={faq.imageDriveId} nombre={faq.imageName} titulo={faq.question} />
          )}

          {faq.cause && (
            <Campo etiqueta="CAUSA PROBABLE">
              <p style={{ fontSize: 13, color: "var(--kc-ink-2)", margin: 0, lineHeight: 1.6 }}>
                {faq.cause}
              </p>
            </Campo>
          )}

          {faq.steps.length > 0 && (
            <Campo etiqueta="SOLUCIÓN — PASOS NUMERADOS">
              <Pasos pasos={faq.steps} />
            </Campo>
          )}

          {faq.recommendations && (
            <Campo etiqueta="RECOMENDACIONES / CONSIDERACIONES">
              <p
                style={{
                  fontSize: 13,
                  color: "var(--kc-ink-2)",
                  margin: 0,
                  lineHeight: 1.6,
                  background: "var(--kc-bg)",
                  border: "1px solid var(--kc-line)",
                  borderRadius: 9,
                  padding: "12px 14px",
                }}
              >
                {faq.recommendations}
              </p>
            </Campo>
          )}

          {faq.altSteps.length > 0 && <Alternativa pasos={faq.altSteps} />}

          {comentarios.length > 0 && <Aportaciones comentarios={comentarios} />}
        </div>

        <Utilidad faq={faq} />
      </article>

      <Lateral faq={faq} />
    </div>
  );
}

/* ── Un campo rotulado ─────────────────────────────────────────────────── */

/**
 * La etiqueta y su contenido.
 *
 * Es el patrón que estructura toda la ficha, tal como el borrador: el rótulo en
 * versalitas y pequeño, el dato debajo. Repetirlo en cada bloque es lo que deja
 * recorrer la ficha con la vista sin leerla entera —se salta a CAUSA PROBABLE o
 * a los pasos directamente—.
 */
function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <section>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: ".11em",
          color: "var(--kc-ink-4)",
          marginBottom: 8,
        }}
      >
        {etiqueta}
      </div>
      {children}
    </section>
  );
}

/* ── El mensaje de error, tal cual lo muestra el programa ──────────────── */

function MensajeError({ texto }: { texto: string }) {
  /*
   * Cuando no hay mensaje, el Excel guarda una descripción entre paréntesis
   * —«(sin mensaje — el modelo tarda)»—. Eso no es una cita: se pinta como nota
   * y sin la tipografía de máquina, porque presentarlo como texto literal haría
   * buscar en pantalla algo que no existe.
   */
  const esNota = texto.trimStart().startsWith("(");

  return (
    <Campo etiqueta={esNota ? "MENSAJE DE ERROR" : "MENSAJE DE ERROR (TEXTO LITERAL)"}>
      {esNota ? (
        <p style={{ fontSize: 12.5, color: "var(--kc-ink-4)", margin: 0, fontStyle: "italic" }}>
          {texto}
        </p>
      ) : (
        <p
          style={{
            fontSize: 12.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "var(--kc-ink-2)",
            background: "var(--kc-bg)",
            border: "1px solid var(--kc-line)",
            borderRadius: 9,
            padding: "12px 14px",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {texto}
        </p>
      )}
    </Campo>
  );
}

/* ── La captura ───────────────────────────────────────────────────────── */

function Captura({
  driveId,
  nombre,
  titulo,
}: {
  driveId: string;
  nombre: string | null;
  titulo: string;
}) {
  const [estado, setEstado] = useState<"cargando" | "lista" | "falla">("cargando");

  /*
   * Si la imagen no llega, el bloque desaparece.
   *
   * Puede pasar legítimamente —alguien sin acceso a esa carpeta de Drive recibe
   * un 404, y eso es correcto: la aplicación hereda permisos, no los amplía—.
   * Mejor no mostrar nada que el icono roto del navegador.
   */
  if (estado === "falla") return null;

  return (
    <Campo etiqueta="IMAGEN DEL ERROR">
      <figure style={{ margin: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            /* Alto mínimo mientras carga: sin esto la página pega un salto
               cuando aparece la imagen y empuja todo lo de abajo. */
            minHeight: estado === "cargando" ? 220 : 0,
            padding: 16,
            border: "1px solid var(--kc-line)",
            borderRadius: 11,
            backgroundColor: "var(--kc-bg)",
            /* Cuadriculado tenue: casi todas las capturas son recortes de
               diálogos con fondo claro, y sobre blanco no se distingue dónde
               termina la imagen. */
            backgroundImage:
              "linear-gradient(45deg, rgba(16,32,57,.035) 25%, transparent 25%, transparent 75%, rgba(16,32,57,.035) 75%), linear-gradient(45deg, rgba(16,32,57,.035) 25%, transparent 25%, transparent 75%, rgba(16,32,57,.035) 75%)",
            backgroundSize: "18px 18px",
            backgroundPosition: "0 0, 9px 9px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Se sirve desde
              nuestra propia ruta con la cuenta de quien mira; `next/image`
              querría optimizarla en el servidor, que no tiene esos permisos. */}
          <img
            src={`/api/imagen/${driveId}`}
            alt={`Captura del error: ${titulo}`}
            onError={() => setEstado("falla")}
            onLoad={() => setEstado("lista")}
            style={{
              maxWidth: "100%",
              maxHeight: 520,
              height: "auto",
              display: "block",
              borderRadius: 7,
              border: "1px solid var(--kc-line)",
              background: "#fff",
              boxShadow: "0 2px 14px rgba(16,32,57,.09)",
              opacity: estado === "lista" ? 1 : 0,
              transition: "opacity .3s",
            }}
          />
        </div>

        {/*
          El pie lleva solo el nombre del archivo.
          En el borrador aparecía además «Sí, este es exactamente el error que me
          aparece», pero eso era la anotación del wireframe explicando POR QUÉ la
          captura va destacada —no un texto para la pantalla—.
        */}
        {nombre && (
          <figcaption style={{ fontSize: 11, color: "var(--kc-ink-4)", marginTop: 7 }}>
            {nombre}
          </figcaption>
        )}
      </figure>
    </Campo>
  );
}

/* ── Los pasos ─────────────────────────────────────────────────────────── */

function Pasos({ pasos }: { pasos: string[] }) {
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
      {pasos.map((p, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "9px 12px",
            borderRadius: 9,
            /* Filas alternas: en una lista de ocho pasos, ver dónde termina uno
               y empieza el siguiente cuesta sin esta ayuda. */
            background: i % 2 === 0 ? "var(--kc-bg)" : "transparent",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 21,
              height: 21,
              borderRadius: 6,
              background: "var(--kc-faq-soft)",
              color: "var(--kc-faq-ink)",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {i + 1}
          </span>
          <span style={{ fontSize: 13, color: "var(--kc-ink-2)", lineHeight: 1.6 }}>{p}</span>
        </li>
      ))}
    </ol>
  );
}

/** La solución alternativa, plegada: se lee solo si la primera no funcionó. */
function Alternativa({ pasos }: { pasos: string[] }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <Campo etiqueta="SOLUCIÓN ALTERNATIVA">
      <div style={{ border: "1px solid var(--kc-line)", borderRadius: 10, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="kc-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            width: "100%",
            border: "none",
            background: "var(--kc-bg)",
            padding: "11px 14px",
            textAlign: "left",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--kc-ink-2)",
          }}
        >
          <span
            aria-hidden="true"
            style={{ transform: abierta ? "rotate(90deg)" : "none", transition: "transform .2s", display: "flex", color: "var(--kc-ink-4)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
          Si eso no funcionó, hay otra vía
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--kc-ink-4)", fontWeight: 500 }}>
            {pasos.length} pasos
          </span>
        </button>

        {abierta && (
          <div className="kc-fade" style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--kc-line)" }}>
            <Pasos pasos={pasos} />
          </div>
        )}
      </div>
    </Campo>
  );
}

/* ── Lo que aportó el equipo ───────────────────────────────────────────── */

/**
 * Los comentarios aceptados, debajo de la ficha.
 *
 * Van DESPUÉS de la solución oficial y con otro tono, para que se lea claro qué
 * sostiene el área y qué añadió alguien del equipo: mezclarlos daría a un
 * apunte suelto la misma autoridad que un procedimiento revisado.
 */
function Aportaciones({ comentarios }: { comentarios: Comentario[] }) {
  return (
    <Campo etiqueta="APORTACIONES DEL EQUIPO">
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {comentarios.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span
              aria-hidden="true"
              style={{
                width: 3,
                alignSelf: "stretch",
                borderRadius: 2,
                background: "var(--kc-line-2)",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12.5, color: "var(--kc-ink-2)", margin: "0 0 4px", lineHeight: 1.6 }}>
                {c.message}
              </p>
              <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: 0 }}>
                {c.authorName}
                {c.authorArea ? ` · ${c.authorArea}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Campo>
  );
}

/* ── ¿Te sirvió? ───────────────────────────────────────────────────────── */

function Utilidad({ faq }: { faq: Faq }) {
  const [voto, setVoto] = useState<boolean | null>(faq.miVoto);
  const [cuenta, setCuenta] = useState({ si: faq.helpful, no: faq.notHelpful });
  const [pendiente, iniciar] = useTransition();

  function votar(util: boolean) {
    const previo = voto;
    const previaCuenta = cuenta;

    // Se pinta antes de que responda el servidor: votar casi nunca falla y
    // esperar rompe el gesto.
    setVoto(util);
    setCuenta((c) => ({
      si: c.si + (util ? 1 : 0) - (previo === true ? 1 : 0),
      no: c.no + (!util ? 1 : 0) - (previo === false ? 1 : 0),
    }));

    iniciar(async () => {
      const res = await votarFaq(faq.id, util);
      if (res.ok && res.helpful !== undefined && res.notHelpful !== undefined) {
        setCuenta({ si: res.helpful, no: res.notHelpful });
      } else {
        setVoto(previo);
        setCuenta(previaCuenta);
      }
    });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        /*
         * El padding lateral tiene que estar: esta barra es el pie del panel y
         * antes solo llevaba `paddingTop`, así que «¿Te sirvió?» quedaba pegado
         * al borde izquierdo y «Comentar» al derecho, medio salidos de la caja.
         */
        padding: "14px 22px",
        borderTop: "1px solid var(--kc-line)",
        background: "var(--kc-bg)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--kc-ink-3)" }}>¿Te sirvió?</span>

      <BotonVoto activo={voto === true} onClick={() => votar(true)} disabled={pendiente} etiqueta="Sí" n={cuenta.si} />
      <BotonVoto activo={voto === false} onClick={() => votar(false)} disabled={pendiente} etiqueta="No" n={cuenta.no} />

      <Link
        href={`/faq/comentar?faq=${faq.id}`}
        className="kc-btn"
        style={{
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink-2)",
          fontSize: 11.5,
          fontWeight: 600,
          padding: "8px 13px",
          borderRadius: 9,
          textDecoration: "none",
        }}
      >
        Comentar
      </Link>
    </div>
  );
}

function BotonVoto({
  activo,
  onClick,
  disabled,
  etiqueta,
  n,
}: {
  activo: boolean;
  onClick: () => void;
  disabled: boolean;
  etiqueta: string;
  n: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="kc-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${activo ? "var(--kc-green-solid)" : "var(--kc-line)"}`,
        background: activo ? "var(--kc-cap-soft)" : "#fff",
        color: activo ? "var(--kc-cap-ink)" : "var(--kc-ink-2)",
        fontSize: 11.5,
        fontWeight: 600,
        padding: "8px 13px",
        borderRadius: 9,
      }}
    >
      {etiqueta}
      {n > 0 && <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>{n}</span>}
    </button>
  );
}

/* ── La barra lateral: palabras clave y fichas relacionadas ────────────── */

function Lateral({ faq }: { faq: Faq }) {
  return (
    <aside
      className="kc-panel kc-sticky"
      style={{ padding: "16px 15px", display: "flex", flexDirection: "column", gap: 18 }}
    >
      {/*
        «Datos de la ficha»: dónde ocurre y de qué trata.
        En el borrador encabeza la columna derecha, y tiene sentido: son las
        señas que sitúan el problema antes de leer nada más.
      */}
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".11em", color: "var(--kc-ink-4)", marginBottom: 10 }}>
          DATOS DE LA FICHA
        </div>

        <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          {faq.platform && <Dato termino="Software" valor={faq.platform} />}
          <Dato termino="Categoría" valor={faq.category} />
          {faq.steps.length > 0 && <Dato termino="Pasos" valor={String(faq.steps.length)} />}
          {faq.altSteps.length > 0 && <Dato termino="Alternativa" valor={`${faq.altSteps.length} pasos`} />}
          {faq.imageName && <Dato termino="Captura" valor={faq.imageName} />}
        </dl>
      </div>

      {faq.keywords.length > 0 && (
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".11em", color: "var(--kc-ink-4)", marginBottom: 9 }}>
            PALABRAS CLAVE
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {faq.keywords.map((k) => (
              <span
                key={k}
                style={{
                  fontSize: 10.5,
                  color: "var(--kc-ink-3)",
                  background: "var(--kc-bg)",
                  border: "1px solid var(--kc-line)",
                  borderRadius: 6,
                  padding: "3px 8px",
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {faq.relatedCodes.length > 0 && (
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".11em", color: "var(--kc-ink-4)", marginBottom: 9 }}>
            FAQ RELACIONADOS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {faq.relatedCodes.map((c) => (
              <Link
                key={c}
                href={`/faq/${c}`}
                className="kc-btn"
                style={{
                  display: "block",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--kc-faq-ink)",
                  textDecoration: "none",
                  border: "1px solid var(--kc-line)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      )}

      {faq.resourceCode && (
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".11em", color: "var(--kc-ink-4)", marginBottom: 9 }}>
            DOCUMENTO
          </div>
          <Link
            href={`/biblioteca/${encodeURIComponent(faq.resourceCode)}?de=faq`}
            className="kc-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink-2)",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "7px 11px",
              borderRadius: 9,
              textDecoration: "none",
            }}
          >
            <Icon name="lib" size={12} />
            Ver el manual
          </Link>
        </div>
      )}
    </aside>
  );
}

/** Un dato de la ficha: término a la izquierda, valor a la derecha. */
function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <dt style={{ fontSize: 11, color: "var(--kc-ink-4)", flexShrink: 0, width: 68 }}>{termino}</dt>
      <dd
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--kc-ink-2)",
          margin: 0,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {valor}
      </dd>
    </div>
  );
}
