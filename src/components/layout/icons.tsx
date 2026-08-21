/**
 * Los iconos de Sohersa Knowledge Grid.
 *
 * Se dibujan a mano en vez de tomarlos de una librería porque el diseño usa
 * trazos concretos —el nodo con satélite de "Mi ruta", los dos bloques de la
 * biblioteca— que no existen tal cual en ningún paquete. Copiar los `path` del
 * diseño garantiza que la implementación se vea idéntica.
 *
 * Todos heredan el color con `currentColor` y comparten firma, para poder
 * elegirlos por nombre desde la navegación sin un `switch` en cada sitio.
 */

export type IconName =
  | "home"
  | "lib"
  | "tool"
  | "cap"
  | "path"
  | "faq"
  | "com"
  | "star"
  | "hist"
  | "me"
  | "adm"
  | "lock"
  | "search"
  | "back"
  | "plus"
  | "logout";

type Props = { size?: number };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function Icon({ name, size = 15 }: Props & { name: IconName }) {
  const p = { ...base, width: size, height: size };

  switch (name) {
    case "home":
      return (
        <svg {...p}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case "lib":
      return (
        <svg {...p}>
          <path d="M4 4h6v16H4zM14 4h6v16h-6" />
          <path d="M4 9h6M14 9h6" />
        </svg>
      );
    case "tool":
      return (
        <svg {...p}>
          <path d="M14.7 6.3a4 4 0 0 0 5 5L14 17l-3 3-4-4 3-3z" />
          <path d="M7 7 4 4" />
        </svg>
      );
    case "cap":
      return (
        <svg {...p}>
          <path d="m3 8 9-4 9 4-9 4z" />
          <path d="M7 11v5c0 1.7 2.2 3 5 3s5-1.3 5-3v-5" />
        </svg>
      );
    case "path":
      return (
        <svg {...p}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="M9 6h5a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8" />
        </svg>
      );
    case "faq":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "com":
      return (
        <svg {...p}>
          <path d="M8 13H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          <path d="M10 20v-7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5z" />
        </svg>
      );
    case "star":
      return (
        <svg {...p} strokeLinecap={undefined}>
          <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "hist":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l4 2" />
        </svg>
      );
    case "me":
      return (
        <svg {...p}>
          <path d="M4 20a8 8 0 0 1 16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "adm":
      return (
        <svg {...p}>
          <path d="M4 6h16M4 12h16M4 18h9" />
          <circle cx="17" cy="18" r="2.4" />
        </svg>
      );
    case "lock":
      return (
        <svg {...p}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "back":
      return (
        <svg {...p} strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p} strokeWidth={2.4}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "logout":
      return (
        <svg {...p}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
  }
}
