"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { GridMark } from "@/components/brand/GridGlyph";

/**
 * El riel de navegación.
 *
 * Es cliente porque necesita `usePathname` para saber qué sección está activa;
 * los datos que muestra —los contadores, si hay ruta— los calcula el servidor y
 * llegan por props. Así el riel no consulta nada por su cuenta.
 */

export type RailItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: string | null;
  /** Cuando la sección existe pero esta persona todavía no puede entrar. */
  disabled?: boolean;
  /** Por qué está apagada, para el `title` del elemento. */
  tip?: string;
};

/**
 * Si una ruta está activa.
 *
 * `/biblioteca/4.1` mantiene encendida la Biblioteca: al abrir el detalle de un
 * documento, apagar la sección de la que vienes hace perder el sitio. La raíz
 * es el único caso que exige coincidencia exacta, porque si no todo la
 * encendería.
 */
function estaActiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function ItemRail({ item, activa }: { item: RailItem; activa: boolean }) {
  const contenido = (
    <>
      <Icon name={item.disabled ? "lock" : item.icon} size={15} />
      <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
      {item.badge && (
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            color: activa ? "var(--kc-green)" : "var(--kc-dk-2)",
            background: "rgba(255,255,255,.08)",
            borderRadius: 20,
            padding: "1px 7px",
          }}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  const estilo: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 11px",
    borderRadius: 10,
    fontSize: 13,
    textDecoration: "none",
  };

  // Una sección bloqueada no es un enlace: se ve, se explica por qué está
  // apagada, y no lleva a ningún lado. Dejarla como enlace haría que el
  // servidor tuviera que rechazar la visita, que es peor experiencia.
  if (item.disabled) {
    return (
      <div
        title={item.tip}
        aria-disabled="true"
        style={{ ...estilo, color: "#4A6076", cursor: "not-allowed" }}
      >
        {contenido}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={activa ? "page" : undefined}
      className="kc-rail-link"
      style={{
        ...estilo,
        color: activa ? "#fff" : "var(--kc-dk-2)",
        // El mismo realce que en las demás herramientas: el verde de la marca
        // al 14%, plano. El degradado con borde interior de antes era más
        // vistoso pero distinto, y al cambiar de herramienta se notaba.
        background: activa ? "var(--cv-green-fill)" : "transparent",
        fontWeight: activa ? 600 : 400,
      }}
    >
      {contenido}
    </Link>
  );
}

export function Rail({
  principales,
  secundarias,
}: {
  principales: RailItem[];
  secundarias: RailItem[];
}) {
  const pathname = usePathname();

  return (
    <aside
      className="kc-rail kc-dots"
      /*
       * Sin `position` aquí: el estilo inline gana sobre la hoja y sustituía el
       * `sticky` de `.kc-rail` por `relative`, con lo que el riel se iba con la
       * página al bajar. `sticky` ya establece contexto de posicionamiento, así
       * que los hijos absolutos —la trama de puntos— siguen anclados a él.
       */
      style={{ padding: "15px 11px 11px" }}
    >
      {/* Marca */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "5px 7px 16px",
        }}
      >
        <GridMark size={38} glyph={23} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: ".19em",
              color: "var(--kc-green)",
            }}
          >
            SOHERSA
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-.018em",
              color: "#fff",
              lineHeight: 1.15,
            }}
          >
            Knowledge
            <br />
            Grid
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav
        aria-label="Secciones"
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {principales.map((item) => (
          <ItemRail key={item.href} item={item} activa={estaActiva(pathname, item.href)} />
        ))}

        <div
          style={{ height: 1, background: "rgba(255,255,255,.07)", margin: "11px 8px" }}
        />

        {secundarias.map((item) => (
          <ItemRail key={item.href} item={item} activa={estaActiva(pathname, item.href)} />
        ))}
      </nav>

      {/* Quién soy y la salida se fueron de aquí: ya están arriba, en la barra
          superior, en el mismo sitio que en las demás herramientas de Sohersa.
          Tenerlos en los dos lados obligaba a mirar dos veces para lo mismo, y
          al cambiar de herramienta la salida parecía moverse de sitio. */}

    </aside>
  );
}
