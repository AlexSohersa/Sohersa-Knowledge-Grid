import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GridGlyph } from "@/components/brand/GridGlyph";
import { GoogleButton } from "./google-button";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Tu cuenta no tiene acceso a Sohersa Knowledge Grid. Usa tu correo @gruposohersa.com o pide que te den de alta.",
  OAuthSignin: "No se pudo iniciar la conexión con Google. Vuelve a intentarlo.",
  OAuthCallback: "Google rechazó la respuesta. Vuelve a intentarlo.",
  Configuration: "Falta configuración del servidor. Avisa al equipo de sistemas.",
  Verification: "El enlace expiró. Solicita uno nuevo.",
  Default: "No pudimos completar el acceso. Vuelve a intentarlo.",
};

/** Los tres pilares del Centro, con el color de su dominio. Del diseño. */
const PILARES = [
  {
    color: "#32D66B",
    halo: "rgba(50,214,107,.16)",
    titulo: "Biblioteca y estándares",
    detalle: "Instructivos, manuales y plantillas con su versión vigente.",
  },
  {
    color: "#39B8B4",
    halo: "rgba(57,184,180,.16)",
    titulo: "Capacitaciones y rutas",
    detalle: "Aprende del equipo y sigue tu camino asignado.",
  },
  {
    color: "#8B7CF6",
    halo: "rgba(139,124,246,.16)",
    titulo: "Comunidad y soluciones",
    detalle: "Lo que ya resolvió alguien más, validado y a la mano.",
  },
];

/**
 * La puerta de Sohersa Knowledge Grid.
 *
 * Dos columnas: a la izquierda qué es esto, a la derecha cómo entrar. El botón
 * de Google es el único camino porque la empresa entera vive en Workspace, y
 * porque la sesión se comparte con las demás herramientas de la plataforma.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null;

  return (
    <main
      className="kc-dots"
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "linear-gradient(160deg,#07172B,#0C2038 58%,#07172B)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Auroras de marca. Quietas: en la puerta no hace falta que deriven. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -160,
          left: "14%",
          width: 620,
          height: 460,
          borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(50,214,107,.15),transparent 66%)",
          filter: "blur(56px)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -180,
          right: "8%",
          width: 560,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(57,184,180,.13),transparent 66%)",
          filter: "blur(52px)",
        }}
      />

      {/* El grafo de conocimiento: nodos enlazados, la metáfora de la casa. */}
      <svg
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}
      >
        <g fill="none" stroke="#39B8B4" strokeWidth="1" opacity=".3">
          <path d="M150 560 L470 660 L790 560 L470 460 Z" />
          <path d="M150 500 L470 600 L790 500 L470 400 Z" />
        </g>
        <g fill="none" stroke="#32D66B" strokeWidth="1.3" opacity=".45" strokeLinecap="round">
          <path d="M210 400 L390 300 L560 350 L740 240 L910 296 L1080 210" />
          <path d="M390 300 L420 170 L610 128" />
          <path d="M560 350 L640 470" />
        </g>
        <g fill="#32D66B">
          <circle cx="390" cy="300" r="6" />
          <circle cx="740" cy="240" r="7.5" />
          <circle cx="610" cy="128" r="5" />
        </g>
        <g fill="#39B8B4" opacity=".85">
          <circle cx="210" cy="400" r="4.5" />
          <circle cx="560" cy="350" r="4.5" />
          <circle cx="910" cy="296" r="4.5" />
          <circle cx="1080" cy="210" r="4" />
          <circle cx="420" cy="170" r="4" />
          <circle cx="640" cy="470" r="4" />
        </g>
        <circle cx="740" cy="240" r="19" fill="none" stroke="#32D66B" strokeWidth="1.1" opacity=".35" />
      </svg>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.06fr) minmax(320px,392px)",
          gap: 56,
          alignItems: "center",
          maxWidth: 1030,
          width: "100%",
        }}
      >
        {/* ── Izquierda: qué es esto ─────────────────────────────────────── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 15,
                background: "#0A1526",
                border: "1.5px solid rgba(50,214,107,.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <GridGlyph size={30} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: ".2em",
                  color: "var(--kc-green)",
                }}
              >
                SOHERSA
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  color: "#fff",
                  lineHeight: 1.1,
                }}
              >
                Knowledge Grid
              </div>
            </div>
          </div>

          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-.04em",
              lineHeight: 1.08,
              color: "#fff",
              margin: "32px 0 0",
              textWrap: "pretty",
            }}
          >
            Aquí está el conocimiento
            <br />
            <span style={{ color: "var(--kc-green)" }}>de Sohersa.</span>
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.65,
              color: "#9DB2C6",
              margin: "16px 0 0",
              maxWidth: 470,
              textWrap: "pretty",
            }}
          >
            Manuales, estándares, herramientas, capacitaciones y la experiencia del
            equipo. Si necesitas aprender, encontrar o resolver algo, empieza aquí.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 13,
              margin: "30px 0 0",
              maxWidth: 460,
            }}
          >
            {PILARES.map((p) => (
              <div key={p.titulo} style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: p.color,
                    flexShrink: 0,
                    marginTop: 6,
                    boxShadow: `0 0 0 3px ${p.halo}`,
                  }}
                />
                <span style={{ lineHeight: 1.5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{p.titulo}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--kc-dk-2)" }}>
                    {p.detalle}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "var(--kc-dk-3)",
              marginTop: 34,
              letterSpacing: ".02em",
            }}
          >
            © {new Date().getFullYear()} SOHERSA · Departamento de Transformación Digital
          </div>
        </div>

        {/* ── Derecha: la entrada ────────────────────────────────────────── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 22,
            padding: "32px 30px",
            boxShadow: "0 30px 70px rgba(0,0,0,.3)",
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-.026em",
              color: "var(--kc-ink)",
              margin: 0,
            }}
          >
            Iniciar sesión
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--kc-ink-3)",
              margin: "7px 0 0",
              lineHeight: 1.55,
            }}
          >
            Usa tu cuenta corporativa de Google. Un solo acceso para todo el Centro.
          </p>

          <GoogleButton />

          {message && (
            <p
              role="alert"
              style={{
                margin: "16px 0 0",
                padding: "11px 13px",
                borderRadius: 11,
                background: "#FCE9EA",
                border: "1px solid rgba(194,56,64,.28)",
                color: "#9B2C33",
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
            <span style={{ flex: 1, height: 1, background: "#EDF2F7" }} />
            <span style={{ fontSize: 10.5, color: "#A9B7C6", letterSpacing: ".06em" }}>
              ACCESO INTERNO
            </span>
            <span style={{ flex: 1, height: 1, background: "#EDF2F7" }} />
          </div>

          <p style={{ fontSize: 11.5, color: "var(--kc-ink-4)", margin: 0, lineHeight: 1.6 }}>
            Tu perfil, tu ruta de capacitación y tus guardados se sincronizan con tu
            cuenta de Sohersa.
          </p>
        </div>
      </div>
    </main>
  );
}
