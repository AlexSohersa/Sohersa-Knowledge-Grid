import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { misRutasWired } from "@/modules/rutas/infrastructure/wiring";
import { listarPreguntasWired } from "@/modules/comunidad/infrastructure/wiring";
import { PageHead, EmptyState } from "@/components/ui/PageHead";
import { Barra } from "@/components/capacitaciones/CapacitacionesGaleria";
import { Pill } from "@/components/ui/Pill";
import { haceCuanto } from "@/modules/shared/domain/formato";

export const revalidate = 0;

/**
 * Mi aprendizaje: el expediente de formación de cada quien.
 *
 * Reúne lo que está repartido por el Centro: las rutas asignadas con su avance
 * real y lo que se ha aportado a la comunidad. Es la pantalla que sirve para
 * una conversación de desempeño: qué he hecho y qué me falta.
 *
 * No aparecen las capacitaciones sueltas: consultarlas no es "avanzar", y
 * mezclarlas aquí inflaría el expediente con material que solo se hojeó.
 */
export default async function AprendizajePage() {
  const yo = await exigirSesion();

  const [rutas, comunidad] = await Promise.all([
    misRutasWired(yo.email),
    listarPreguntasWired(yo.email),
  ]);

  const enCurso = rutas.filter((r) => !r.avance.completa);
  const completadas = rutas.filter((r) => r.avance.completa);

  // Lo aportado a la comunidad cuenta como aprendizaje: quien responde también
  // está formando al equipo, y el expediente sería injusto si solo midiera
  // consumo.
  const misPreguntas = comunidad.items.filter(
    (p) => p.email.toLowerCase() === yo.email.toLowerCase(),
  );
  const misRespuestas = comunidad.items.flatMap((p) =>
    p.respuestas.filter((r) => r.email.toLowerCase() === yo.email.toLowerCase()),
  );
  const misSoluciones = misRespuestas
    .filter((r) => r.validatedAt !== null)
    .sort((a, b) => b.validatedAt!.getTime() - a.validatedAt!.getTime());

  // Cuántos elementos de ruta lleva hechos en total.
  const itemsHechos = rutas.reduce((n, r) => n + r.avance.hechos, 0);

  const sinNada = rutas.length === 0 && misRespuestas.length === 0;

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="me"
        title="Mi aprendizaje"
        description={`Tu formación en el Centro, ${yo.name}`}
        accent="var(--kc-violet)"
      />

      {/* ── Resumen ─────────────────────────────────────────────────────── */}
      <div
        className="kc-rise"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Tarjeta n={completadas.length} etiqueta="rutas completadas" acento="var(--kc-green)" />
        <Tarjeta n={enCurso.length} etiqueta="rutas en curso" acento="var(--kc-teal)" />
        <Tarjeta n={itemsHechos} etiqueta="contenidos terminados" acento="var(--kc-blue)" />
        <Tarjeta
          n={misSoluciones.length}
          etiqueta="respuestas marcadas como solución"
          acento="var(--kc-amber)"
        />
      </div>

      {sinNada ? (
        <EmptyState
          title="Tu expediente está en blanco todavía"
          action={
            <Link
              href="/capacitaciones"
              className="kc-btn"
              style={{
                display: "inline-flex",
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                padding: "11px 18px",
                borderRadius: 11,
                textDecoration: "none",
                boxShadow: "var(--kc-shadow-btn)",
              }}
            >
              Explorar capacitaciones
            </Link>
          }
        >
          Cuando te asignen una ruta o respondas en la comunidad, aquí verás tu avance
          reunido. Mientras tanto, toda la biblioteca de capacitaciones está abierta
          para consultar lo que necesites.
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Rutas en curso */}
          {enCurso.length > 0 && (
            <Seccion titulo={enCurso.length > 1 ? "Rutas en curso" : "Ruta en curso"}>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {enCurso.map((r) => (
                  <Link
                    key={r.assignmentId}
                    href={`/ruta?r=${r.asignada.ruta.id}`}
                    className="kc-panel kc-lift"
                    style={{ padding: "16px 18px", textDecoration: "none", display: "block" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "baseline",
                      }}
                    >
                      <h3
                        style={{
                          flex: 1,
                          minWidth: 200,
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--kc-ink)",
                          margin: 0,
                          letterSpacing: "-.018em",
                        }}
                      >
                        {r.asignada.ruta.name}
                      </h3>
                      <span style={{ fontSize: 12, color: "var(--kc-ink-3)" }}>
                        {r.avance.hechos}/{r.avance.total} · {r.avance.pct}%
                      </span>
                    </div>
                    <div style={{ marginTop: 11 }}>
                      <Barra pct={r.avance.pct} color="var(--kc-teal)" />
                    </div>
                    {r.avance.siguiente && (
                      <p style={{ fontSize: 11.5, color: "var(--kc-ink-3)", margin: "9px 0 0" }}>
                        Sigue: <strong>{r.avance.siguiente.title}</strong>
                        {r.avance.etapaActual ? ` · ${r.avance.etapaActual}` : ""}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </Seccion>
          )}

          {/* Rutas completadas */}
          {completadas.length > 0 && (
            <Seccion titulo="Rutas completadas">
              <div className="kc-panel" style={{ overflow: "hidden" }}>
                {completadas.map((r, i) => (
                  <Link
                    key={r.assignmentId}
                    href={`/ruta?r=${r.asignada.ruta.id}`}
                    className="kc-row-h"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 17px",
                      borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--kc-green)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--kc-ink)",
                        }}
                      >
                        {r.asignada.ruta.name}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--kc-ink-4)" }}>
                        {r.avance.total}{" "}
                        {r.avance.total === 1 ? "contenido" : "contenidos"} · iniciada{" "}
                        {haceCuanto(r.asignada.startedAt)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Seccion>
          )}

          {/* Lo aportado a la comunidad */}
          {(misRespuestas.length > 0 || misPreguntas.length > 0) && (
            <Seccion titulo="Lo que has aportado a la comunidad">
              <div className="kc-panel" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Pill soft="var(--kc-com-soft)" ink="var(--kc-com-ink)">
                    {misPreguntas.length}{" "}
                    {misPreguntas.length === 1 ? "pregunta hecha" : "preguntas hechas"}
                  </Pill>
                  <Pill soft="var(--kc-tool-soft)" ink="var(--kc-tool-ink)">
                    {misRespuestas.length}{" "}
                    {misRespuestas.length === 1 ? "respuesta" : "respuestas"}
                  </Pill>
                  {misSoluciones.length > 0 && (
                    <Pill soft="var(--kc-cap-soft)" ink="var(--kc-cap-ink)">
                      {misSoluciones.length}{" "}
                      {misSoluciones.length === 1
                        ? "marcada como solución"
                        : "marcadas como solución"}
                    </Pill>
                  )}
                </div>

                {misSoluciones.length > 0 && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--kc-ink-3)",
                      margin: "13px 0 0",
                      lineHeight: 1.55,
                    }}
                  >
                    Tu última solución validada fue {haceCuanto(misSoluciones[0].validatedAt)}.
                    Gracias por documentar lo que sabes: es lo que hace que el Centro
                    valga la pena.
                  </p>
                )}
              </div>
            </Seccion>
          )}
        </div>
      )}
    </div>
  );
}

function Tarjeta({ n, etiqueta, acento }: { n: number; etiqueta: string; acento: string }) {
  return (
    <div className="kc-panel" style={{ padding: "15px 16px", borderTop: `3px solid ${acento}` }}>
      <span
        style={{
          display: "block",
          fontSize: 26,
          fontWeight: 700,
          color: "var(--kc-ink)",
          letterSpacing: "-.035em",
          lineHeight: 1.1,
        }}
      >
        {n}
      </span>
      <span
        style={{
          display: "block",
          fontSize: 11,
          color: "var(--kc-ink-3)",
          marginTop: 3,
          lineHeight: 1.4,
        }}
      >
        {etiqueta}
      </span>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="kc-rise">
      <h2
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: ".12em",
          color: "#A9B7C6",
          margin: "0 0 10px",
        }}
      >
        {titulo.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}
