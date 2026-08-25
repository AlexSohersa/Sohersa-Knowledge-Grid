import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarCapacitacionesWired } from "@/modules/capacitaciones/infrastructure/wiring";
import { listarRutasWired } from "@/modules/rutas/infrastructure/wiring";
import { listarFaqWired } from "@/modules/faq/infrastructure/wiring";
import { listarHerramientasWired } from "@/modules/herramientas/infrastructure/wiring";
import { necesitaRevision } from "@/modules/faq/domain/faq";
import { PageHead } from "@/components/ui/PageHead";
import { listarColaboradores } from "@/modules/personas/infrastructure/wiring";
import { Pill } from "@/components/ui/Pill";
import { Icon, type IconName } from "@/components/layout/icons";

export const revalidate = 0;

/**
 * Administración: el panel de quien mantiene el Centro.
 *
 * Es un índice, no un formulario gigante: cada cosa que se administra tiene su
 * propia pantalla. Aquí se ve el estado de todo —qué está en borrador, qué FAQ
 * la gente marca como poco útil— para saber dónde hace falta trabajo.
 */
export default async function AdminPage() {
  const yo = await exigirSesion();

  const [caps, rutas, faq, herramientas, equipo] = await Promise.all([
    // Con borradores: administración necesita ver lo que todavía no se publica.
    listarCapacitacionesWired({ incluirBorradores: true }),
    listarRutasWired(),
    listarFaqWired(yo.email, { incluirBorradores: true }),
    listarHerramientasWired({ incluirInactivas: true }),
    listarColaboradores(),
  ]);

  const personas = equipo.length;

  const borradores = caps.items.filter((c) => c.status === "BORRADOR");
  const publicadas = caps.items.filter((c) => c.status === "PUBLICADA");
  const faqsPorRevisar = faq.categorias
    .flatMap((c) => c.items)
    .filter(necesitaRevision);

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="adm"
        title="Administración"
        description="Publica capacitaciones, arma rutas, mantén las preguntas frecuentes y el catálogo de herramientas"
        accent="var(--kc-violet)"
      />

      {/* Lo que necesita atención va primero: es la razón de entrar aquí. */}
      {(borradores.length > 0 || faqsPorRevisar.length > 0) && (
        <div
          className="kc-panel kc-rise"
          style={{
            padding: "15px 17px",
            marginBottom: 20,
            borderLeft: "3px solid var(--kc-amber)",
            background: "#FFFDF8",
          }}
        >
          <p
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--kc-ink)",
              margin: 0,
            }}
          >
            Pendiente de tu atención
          </p>
          <ul style={{ margin: "8px 0 0", padding: "0 0 0 17px" }}>
            {borradores.length > 0 && (
              <li style={{ fontSize: 12, color: "var(--kc-ink-2)", lineHeight: 1.6 }}>
                {borradores.length}{" "}
                {borradores.length === 1
                  ? "capacitación en borrador, sin publicar"
                  : "capacitaciones en borrador, sin publicar"}
                .
              </li>
            )}
            {faqsPorRevisar.length > 0 && (
              <li style={{ fontSize: 12, color: "var(--kc-ink-2)", lineHeight: 1.6 }}>
                {faqsPorRevisar.length}{" "}
                {faqsPorRevisar.length === 1
                  ? "pregunta frecuente que la gente marca como poco útil"
                  : "preguntas frecuentes que la gente marca como poco útiles"}
                : conviene revisar la respuesta.
              </li>
            )}
          </ul>
        </div>
      )}

      <div
        className="kc-rise"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: 14,
        }}
      >
        <Panel
          icono="cap"
          titulo="Capacitaciones"
          href="/admin/capacitaciones"
          acento="var(--kc-green)"
          descripcion="Crea el curso, agrega sus temas con video y material, y publícalo."
        >
          <Pill soft="var(--kc-cap-soft)" ink="var(--kc-cap-ink)" size="sm">
            {publicadas.length} publicadas
          </Pill>
          {borradores.length > 0 && (
            <Pill soft="var(--kc-faq-soft)" ink="var(--kc-faq-ink)" size="sm">
              {borradores.length} en borrador
            </Pill>
          )}
        </Panel>

        <Panel
          icono="path"
          titulo="Rutas de aprendizaje"
          href="/admin/rutas"
          acento="var(--kc-teal)"
          descripcion="Arma el camino por etapas y asígnalo a quien le toca recorrerlo."
        >
          <Pill soft="var(--kc-tool-soft)" ink="var(--kc-tool-ink)" size="sm">
            {rutas.length} {rutas.length === 1 ? "ruta" : "rutas"}
          </Pill>
        </Panel>

        <Panel
          icono="faq"
          titulo="Preguntas frecuentes"
          href="/admin/faq"
          acento="var(--kc-amber)"
          descripcion="La respuesta oficial de la empresa a lo que más se pregunta."
        >
          <Pill soft="var(--kc-faq-soft)" ink="var(--kc-faq-ink)" size="sm">
            {faq.total} preguntas
          </Pill>
          {faqsPorRevisar.length > 0 && (
            <Pill soft="#FCE9EA" ink="#C23840" size="sm">
              {faqsPorRevisar.length} por revisar
            </Pill>
          )}
        </Panel>

        <Panel
          icono="me"
          titulo="El equipo"
          href="/admin/equipo"
          acento="var(--kc-teal)"
          descripcion="Quién administra, quién revisa el FAQ y qué secciones ve cada quien."
        >
          <Pill soft="var(--kc-cap-soft)" ink="var(--kc-cap-ink)" size="sm">
            {personas} en el padrón
          </Pill>
        </Panel>

        <Panel
          icono="tool"
          titulo="Herramientas"
          href="/admin/herramientas"
          acento="var(--kc-blue)"
          descripcion="El catálogo de software con su versión, licencia y estado de adopción."
        >
          <Pill soft="var(--kc-tool-soft)" ink="var(--kc-tool-ink)" size="sm">
            {herramientas.items.length} registradas
          </Pill>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  icono,
  titulo,
  href,
  acento,
  descripcion,
  children,
}: {
  icono: IconName;
  titulo: string;
  href: string;
  acento: string;
  descripcion: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="kc-panel kc-lift"
      style={{
        padding: "18px 19px",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderTop: `3px solid ${acento}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: `${acento}1F`,
          color: acento,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icono} size={17} />
      </span>

      <div>
        <h2
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            color: "var(--kc-ink)",
            margin: 0,
            letterSpacing: "-.018em",
          }}
        >
          {titulo}
        </h2>
        <p
          style={{
            fontSize: 11.5,
            color: "var(--kc-ink-3)",
            margin: "5px 0 0",
            lineHeight: 1.5,
          }}
        >
          {descripcion}
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto", paddingTop: 4 }}>
        {children}
      </div>
    </Link>
  );
}
