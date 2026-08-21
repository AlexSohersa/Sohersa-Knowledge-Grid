import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { misRutasWired } from "@/modules/rutas/infrastructure/wiring";
import { fechaLarga, duracion, minutosDeTexto } from "@/modules/shared/domain/formato";
import { itemCompleto } from "@/modules/rutas/domain/ruta";
import { PageHead, EmptyState } from "@/components/ui/PageHead";
import { LineaRuta } from "@/components/rutas/LineaRuta";
import { AnilloAvance } from "@/components/rutas/AnilloAvance";

export const revalidate = 0;

/**
 * Mi ruta: lo asignado, con seguimiento real.
 *
 * Aquí SÍ se lleva la cuenta —qué viste, qué descargaste, cuánto te falta— y
 * eso es lo que la distingue de la biblioteca de capacitaciones, que es
 * consulta libre.
 *
 * Se admiten VARIAS rutas por persona: el parámetro `?r=` elige cuál se mira, y
 * arriba quedan las demás como pestañas.
 */
export default async function RutaPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const yo = await exigirSesion();
  const { r } = await searchParams;
  const rutas = await misRutasWired(yo.email);

  if (rutas.length === 0) {
    return (
      <div style={{ padding: "24px 32px 44px" }}>
        <PageHead
          icon="path"
          title="Mi ruta"
          description="El camino de formación que te toca recorrer"
          accent="var(--kc-teal)"
        />
        <EmptyState
          title="Todavía no tienes una ruta asignada"
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
          Las rutas las asigna tu líder o Transformación Digital según el puesto y el
          momento de cada quien. Mientras tanto, toda la biblioteca de capacitaciones
          está abierta para consultar lo que necesites.
        </EmptyState>
      </div>
    );
  }

  // La ruta elegida, o la primera si no se pidió ninguna.
  const vista = rutas.find((x) => x.asignada.ruta.id === r) ?? rutas[0];
  const { asignada, avance, estados } = vista;
  const { ruta } = asignada;

  /*
   * Cuánto tiempo queda: se suman las duraciones de lo que falta.
   *
   * Es más útil que el número de elementos —"3 h 40 min" dice si cabe hoy—,
   * y por eso es lo que muestra el encabezado junto al porcentaje.
   */
  const minutosRestantes = ruta.etapas
    .flatMap((e) => e.items)
    .filter((i) => !itemCompleto(i))
    .reduce((n, i) => n + minutosDeTexto(i.duration), 0);

  return (
    <div>
      {/* ── Cabecera oscura con el anillo de avance ─────────────────────── */}
      <section
        className="kc-dots"
        style={{
          background: "linear-gradient(135deg,#07172B,#0C2038 70%,#0E2138)",
          padding: "30px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -140,
            right: "10%",
            width: 420,
            height: 340,
            borderRadius: "50%",
            background: "radial-gradient(ellipse,rgba(50,214,107,.14),transparent 66%)",
            filter: "blur(52px)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexWrap: "wrap",
          }}
        >
          <AnilloAvance pct={avance.pct} />

          <div style={{ flex: 1, minWidth: 280 }}>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: ".18em",
                color: "var(--kc-green)",
              }}
            >
              TU CAMINO DE CAPACITACIÓN
            </span>
            <h1
              style={{
                fontSize: 27,
                fontWeight: 700,
                letterSpacing: "-.034em",
                color: "#fff",
                margin: "6px 0 0",
                lineHeight: 1.15,
              }}
            >
              {ruta.name}
            </h1>
            {ruta.objective && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--kc-dk-1)",
                  margin: "8px 0 0",
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                {ruta.objective}
              </p>
            )}

            <p
              style={{
                fontSize: 11.5,
                color: "var(--kc-dk-2)",
                margin: "14px 0 0",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ color: "#fff" }}>
                {avance.hechos} de {avance.total}
              </strong>
              contenidos
              {minutosRestantes > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  quedan <strong style={{ color: "#fff" }}>{duracion(minutosRestantes)}</strong>
                </>
              )}
              <span aria-hidden="true">·</span>
              inicio {fechaLarga(asignada.startedAt)}
            </p>
          </div>

          {/* Continuar: lleva directo a lo siguiente sin buscarlo. */}
          {!avance.completa && avance.siguiente && (
            <a
              href="#siguiente"
              className="kc-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                padding: "12px 20px",
                borderRadius: 12,
                textDecoration: "none",
                boxShadow: "var(--kc-shadow-btn-lg)",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Continuar
            </a>
          )}

          {avance.completa && (
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--kc-green)",
                background: "rgba(50,214,107,.14)",
                border: "1px solid rgba(50,214,107,.35)",
                borderRadius: 12,
                padding: "12px 18px",
                flexShrink: 0,
              }}
            >
              Ruta completada
            </span>
          )}
        </div>

        {/* Varias rutas: pestañas para cambiar entre ellas. */}
        {rutas.length > 1 && (
          <nav
            aria-label="Mis rutas"
            style={{
              position: "relative",
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
              marginTop: 22,
            }}
          >
            {rutas.map((x) => {
              const activa = x.asignada.ruta.id === ruta.id;
              return (
                <Link
                  key={x.assignmentId}
                  href={`/ruta?r=${x.asignada.ruta.id}`}
                  className="kc-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    border: `1px solid ${activa ? "rgba(50,214,107,.45)" : "rgba(255,255,255,.14)"}`,
                    background: activa ? "rgba(50,214,107,.15)" : "rgba(255,255,255,.05)",
                    color: activa ? "#fff" : "var(--kc-dk-2)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "8px 13px",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  {x.asignada.ruta.name}
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: activa ? "var(--kc-green)" : "var(--kc-dk-3)",
                    }}
                  >
                    {x.avance.pct}%
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </section>

      {/* ── Las etapas ──────────────────────────────────────────────────── */}
      <div id="siguiente" style={{ padding: "26px 32px 44px" }}>
        <LineaRuta ruta={ruta} estados={estados} />
      </div>
    </div>
  );
}
