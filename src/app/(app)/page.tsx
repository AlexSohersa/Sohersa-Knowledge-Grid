import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { misRutasWired } from "@/modules/rutas/infrastructure/wiring";
import { listarCapacitacionesWired } from "@/modules/capacitaciones/infrastructure/wiring";
import { listarBibliotecaWired } from "@/modules/biblioteca/infrastructure/wiring";
import { listarPreguntasWired } from "@/modules/comunidad/infrastructure/wiring";
import { listarHistorialWired } from "@/modules/personal/infrastructure/wiring";
import { estadoPregunta } from "@/modules/comunidad/domain/pregunta";
import { rutaDe } from "@/modules/personal/domain/guardado";
import { KINDS } from "@/modules/shared/domain/conocimiento";
import { haceCuanto } from "@/modules/shared/domain/formato";
import { GridGlyph } from "@/components/brand/GridGlyph";
import { Pill } from "@/components/ui/Pill";

export const revalidate = 0;

/**
 * La portada del Centro.
 *
 * Responde a "¿qué hago ahora?" antes que a "¿qué hay aquí?": arriba, lo que
 * esta persona tiene a medias —su ruta, el curso que dejó empezado—; después,
 * lo último que se movió. Un directorio de secciones sería más ordenado y menos
 * útil: para eso ya está el riel.
 */
export default async function InicioPage() {
  const yo = await exigirSesion();

  const [rutas, caps, biblioteca, comunidad, historial] = await Promise.all([
    misRutasWired(yo.email),
    listarCapacitacionesWired(),
    listarBibliotecaWired(yo.email),
    listarPreguntasWired(yo.email),
    listarHistorialWired(yo.email, 6),
  ]);

  /*
   * Lo que está a medias sale de las RUTAS, no de las capacitaciones: una
   * capacitación es material de consulta y no tiene "a medias".
   */
  const rutasEnCurso = rutas.filter((r) => !r.avance.completa);
  const ruta = rutas[0] ?? null;
  const sinResponder = comunidad.items
    .filter((p) => estadoPregunta(p) === "sin_responder")
    .slice(0, 3);
  const recientes = historial.grupos.flatMap((g) => g.items).slice(0, 6);

  const nombreCorto = yo.name.split(/\s+/)[0];

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="kc-dots"
        style={{
          background: "linear-gradient(150deg,#07172B,#0C2038 62%,#07172B)",
          padding: "34px 32px 30px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -120,
            right: "6%",
            width: 420,
            height: 340,
            borderRadius: "50%",
            background: "radial-gradient(ellipse,rgba(50,214,107,.16),transparent 66%)",
            filter: "blur(50px)",
          }}
        />

        <div style={{ position: "relative", display: "flex", gap: 22, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <GridGlyph size={22} />
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: ".19em",
                  color: "var(--kc-green)",
                }}
              >
                SOHERSA KNOWLEDGE GRID
              </span>
            </span>

            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-.035em",
                color: "#fff",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Hola, {nombreCorto}.
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--kc-dk-1)",
                margin: "9px 0 0",
                lineHeight: 1.6,
                maxWidth: 480,
              }}
            >
              {ruta && !ruta.avance.completa && ruta.avance.siguiente ? (
                <>
                  Vas por <strong style={{ color: "#fff" }}>{ruta.avance.pct}%</strong> de tu
                  ruta. Sigue: {ruta.avance.siguiente.title}.
                </>
              ) : (
                <>
                  Manuales, estándares, herramientas y la experiencia del equipo. Si
                  necesitas aprender, encontrar o resolver algo, empieza aquí.
                </>
              )}
            </p>

            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 20 }}>
              {ruta && (
                <BotonHero href="/ruta" principal>
                  Continuar mi ruta
                </BotonHero>
              )}
              <BotonHero href="/capacitaciones" principal={!ruta}>
                Explorar capacitaciones
              </BotonHero>
              <BotonHero href="/biblioteca">Ver la biblioteca</BotonHero>
            </div>
          </div>

          {/* Cifras del Centro: cuánto hay, de un vistazo. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 10,
              alignContent: "start",
              minWidth: 240,
            }}
          >
            <Cifra n={biblioteca.total} etiqueta="documentos" />
            <Cifra n={caps.items.length} etiqueta="capacitaciones" />
            <Cifra n={comunidad.total} etiqueta="preguntas" />
            <Cifra n={comunidad.resueltas} etiqueta="resueltas" acento />
          </div>
        </div>
      </section>

      <div style={{ padding: "24px 32px 44px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* ── Mis rutas ─────────────────────────────────────────────────── */}
        {rutasEnCurso.length > 0 && (
          <Bloque
            titulo={rutasEnCurso.length > 1 ? "Tus rutas de formación" : "Tu ruta de formación"}
            href="/ruta"
            verMas="Ver ruta"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
                gap: 12,
              }}
            >
              {rutasEnCurso.map((r) => (
                <Link
                  key={r.assignmentId}
                  href={`/ruta?r=${r.asignada.ruta.id}`}
                  className="kc-panel kc-lift"
                  style={{
                    padding: "15px 16px",
                    textDecoration: "none",
                    borderTop: "3px solid var(--kc-teal)",
                  }}
                >
                  <h3
                    className="kc-clamp-2"
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--kc-ink)",
                      margin: 0,
                      letterSpacing: "-.016em",
                      lineHeight: 1.35,
                    }}
                  >
                    {r.asignada.ruta.name}
                  </h3>
                  {r.avance.siguiente && (
                    <p
                      className="kc-clamp-1"
                      style={{ fontSize: 11.5, color: "var(--kc-ink-3)", margin: "6px 0 0" }}
                    >
                      Sigue: {r.avance.siguiente.title}
                    </p>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10.5,
                        color: "var(--kc-ink-3)",
                        marginBottom: 5,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--kc-tool-ink)" }}>
                        {r.avance.pct}%
                      </span>
                      <span>
                        {r.avance.hechos}/{r.avance.total}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 20,
                        background: "#EDF2F7",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${r.avance.pct}%`,
                          height: "100%",
                          background: "var(--kc-teal)",
                          borderRadius: 20,
                        }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Bloque>
        )}

        {/* ── Lo último que abriste ─────────────────────────────────────── */}
        {recientes.length > 0 && (
          <Bloque titulo="Lo último que abriste" href="/historial" verMas="Ver historial">
            <div className="kc-panel" style={{ overflow: "hidden" }}>
              {recientes.map((v, i) => {
                const estilo = KINDS[v.kind];
                return (
                  <Link
                    key={v.id}
                    href={rutaDe(v.kind, v.targetId)}
                    className="kc-row-h"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 16px",
                      borderTop: i === 0 ? "none" : "1px solid #F1F5F9",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
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
                    <span
                      className="kc-clamp-1"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: "var(--kc-ink)",
                      }}
                    >
                      {v.title}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)", flexShrink: 0 }}>
                      {haceCuanto(v.viewedAt)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Bloque>
        )}

        {/* ── La comunidad necesita ayuda ───────────────────────────────── */}
        {sinResponder.length > 0 && (
          <Bloque
            titulo="Alguien del equipo necesita ayuda"
            href="/comunidad?estado=sin_responder"
            verMas="Ver todas"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sinResponder.map((p) => (
                <Link
                  key={p.id}
                  href={`/comunidad/${p.id}`}
                  className="kc-panel kc-lift"
                  style={{ padding: "13px 16px", textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}
                  >
                    <span
                      className="kc-clamp-1"
                      style={{
                        flex: 1,
                        minWidth: 200,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--kc-ink)",
                      }}
                    >
                      {p.title}
                    </span>
                    <Pill soft="var(--kc-faq-soft)" ink="var(--kc-faq-ink)" size="sm">
                      Sin responder
                    </Pill>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--kc-ink-4)", margin: "5px 0 0" }}>
                    {p.authorName} · {haceCuanto(p.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          </Bloque>
        )}

        {/* Cuando no hay nada personal que mostrar, el Centro se presenta. */}
        {rutasEnCurso.length === 0 && recientes.length === 0 && sinResponder.length === 0 && (
          <div
            className="kc-panel"
            style={{ padding: "34px 26px", textAlign: "center" }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--kc-ink)",
                margin: 0,
                letterSpacing: "-.018em",
              }}
            >
              Bienvenido a Sohersa Knowledge Grid
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--kc-ink-3)",
                margin: "8px auto 0",
                maxWidth: 460,
                lineHeight: 1.6,
              }}
            >
              Aquí vive todo lo que la empresa sabe: manuales y estándares, las
              herramientas que usamos, las capacitaciones del equipo y las respuestas a
              lo que más se pregunta. Empieza por donde quieras.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Cifra({ n, etiqueta, acento }: { n: number; etiqueta: string; acento?: boolean }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.09)",
        borderRadius: 13,
        padding: "12px 14px",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: 22,
          fontWeight: 700,
          color: acento ? "var(--kc-green)" : "#fff",
          letterSpacing: "-.03em",
          lineHeight: 1.1,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 10.5, color: "var(--kc-dk-2)" }}>{etiqueta}</span>
    </div>
  );
}

function BotonHero({
  href,
  children,
  principal,
}: {
  href: string;
  children: React.ReactNode;
  principal?: boolean;
}) {
  return (
    <Link
      href={href}
      className="kc-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: principal ? "none" : "1px solid rgba(255,255,255,.16)",
        background: principal ? "var(--kc-green-solid)" : "rgba(255,255,255,.07)",
        color: principal ? "#fff" : "var(--kc-dk-1)",
        fontSize: 12.5,
        fontWeight: 600,
        padding: "11px 17px",
        borderRadius: 11,
        textDecoration: "none",
        whiteSpace: "nowrap",
        boxShadow: principal ? "var(--kc-shadow-btn)" : "none",
      }}
    >
      {children}
    </Link>
  );
}

function Bloque({
  titulo,
  href,
  verMas,
  children,
}: {
  titulo: string;
  href: string;
  verMas: string;
  children: React.ReactNode;
}) {
  return (
    <section className="kc-rise">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--kc-ink)",
            margin: 0,
            letterSpacing: "-.02em",
            flex: 1,
            minWidth: 180,
          }}
        >
          {titulo}
        </h2>
        <Link
          href={href}
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--kc-ink-3)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {verMas}
          {/* Chevron a la derecha: "ver más" lleva hacia adelante. El icono
              `back` apuntaba al revés y contradecía la acción. */}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>
      {children}
    </section>
  );
}
