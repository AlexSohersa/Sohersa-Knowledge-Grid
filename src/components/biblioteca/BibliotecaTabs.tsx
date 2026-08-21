"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Las dos mitades de la biblioteca.
 *
 * Manuales y automatizaciones se separan en pestañas —y no en un menú lateral—
 * porque son solo dos y comparten la misma pregunta ("¿qué hay disponible?").
 * Se navega con enlaces reales para que cada mitad tenga su dirección y se
 * pueda compartir.
 */
const APARTADOS = [
  { href: "/biblioteca", label: "Manuales y estándares" },
  { href: "/biblioteca/automatizaciones", label: "Automatizaciones" },
];

export function BibliotecaTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Apartados de la biblioteca"
      className="kc-rise"
      style={{
        display: "flex",
        gap: 2,
        borderBottom: "1px solid var(--kc-line)",
        marginBottom: 18,
      }}
    >
      {APARTADOS.map((a) => {
        // La ficha de un documento (`/biblioteca/4.1`) mantiene encendida la
        // pestaña de manuales; solo `automatizaciones` cambia de mitad.
        const activa =
          a.href === "/biblioteca"
            ? !pathname.startsWith("/biblioteca/automatizaciones")
            : pathname.startsWith(a.href);

        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={activa ? "page" : undefined}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "9px 15px",
              color: activa ? "var(--kc-green-ink)" : "var(--kc-ink-3)",
              borderBottom: `2px solid ${activa ? "var(--kc-green)" : "transparent"}`,
              marginBottom: -1,
              textDecoration: "none",
            }}
          >
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}
