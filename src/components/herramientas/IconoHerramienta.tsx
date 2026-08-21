/**
 * El icono de una herramienta: una placa oscura con un glifo de su color.
 *
 * Los glifos son abstractos —una casa para Revit, dos personas para ACC, un
 * grafo de nodos para Dynamo— y no logotipos de marca: reproducir logos ajenos
 * dentro del producto crea un problema de derechos, y además ninguno encajaría
 * con el lenguaje visual del Centro.
 *
 * El glifo se elige por el nombre, así que una herramienta nueva recibe el
 * genérico sin que haya que tocar nada.
 */
export function IconoHerramienta({
  nombre,
  acento,
  size = 44,
}: {
  nombre: string;
  acento: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: "#0E2138",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: acento,
      }}
    >
      <Glifo nombre={nombre} size={Math.round(size * 0.5)} />
    </span>
  );
}

function Glifo({ nombre, size }: { nombre: string; size: number }) {
  const n = nombre.toLowerCase();

  const base = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  // Revit: una casa, que es lo que se modela.
  if (n.includes("revit")) {
    return (
      <svg {...base}>
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  }

  // ACC: dos figuras conectadas — colaboración en la nube.
  if (n.includes("acc") || n.includes("construction cloud")) {
    return (
      <svg {...base}>
        <circle cx="8" cy="9" r="3" />
        <circle cx="17" cy="13" r="2.5" />
        <path d="M2.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M14 20a3.5 3.5 0 0 1 7 0" />
      </svg>
    );
  }

  // Navisworks: cubos federados que se cruzan — detección de interferencias.
  if (n.includes("navis")) {
    return (
      <svg {...base}>
        <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" />
        <path d="M12 12l8-4.5M12 12v9M12 12 4 7.5" />
      </svg>
    );
  }

  // Dynamo: un grafo de nodos — programación visual.
  if (n.includes("dynamo")) {
    return (
      <svg {...base}>
        <circle cx="6" cy="7" r="2.2" />
        <circle cx="18" cy="7" r="2.2" />
        <circle cx="12" cy="17" r="2.2" />
        <path d="M7.6 8.6 10.7 15M16.4 8.6 13.3 15M8.2 7h7.6" />
      </svg>
    );
  }

  // Sohersa Tools: el rombo de la marca con una chispa.
  if (n.includes("sohersa") || n.includes("tools")) {
    return (
      <svg {...base}>
        <path d="M12 3 19 12l-7 9-7-9z" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  // AutoCAD: una hoja de dibujo con líneas.
  if (n.includes("autocad") || n.includes("cad")) {
    return (
      <svg {...base}>
        <path d="M5 3h9l5 5v13H5z" />
        <path d="M14 3v5h5" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    );
  }

  // Power BI / datos: barras.
  if (n.includes("power") || n.includes("bi") || n.includes("dato")) {
    return (
      <svg {...base}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  }

  // Genérica: una llave, como en el riel.
  return (
    <svg {...base}>
      <path d="M14.7 6.3a4 4 0 0 0 5 5L14 17l-3 3-4-4 3-3z" />
      <path d="M7 7 4 4" />
    </svg>
  );
}
