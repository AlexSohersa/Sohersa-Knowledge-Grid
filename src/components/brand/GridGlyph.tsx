/**
 * El glifo de Sohersa Knowledge Grid: un núcleo con un satélite en órbita.
 *
 * Es la marca de la herramienta y sale tal cual del diseño. La órbita gira sola
 * —16 segundos por vuelta, lo bastante lento para no distraer— y se detiene
 * cuando el sistema pide movimiento reducido, por la regla global de
 * `grid.css`.
 */
export function GridGlyph({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke="var(--kc-green)"
        strokeWidth="4.5"
        opacity=".45"
      />
      <circle cx="50" cy="50" r="9.5" fill="var(--kc-green)" />
      <g
        style={{
          transformOrigin: "50px 50px",
          transformBox: "view-box",
          animation: "kc-orbit 16s linear infinite",
        }}
      >
        <circle cx="50" cy="18" r="7" fill="var(--kc-green)" />
      </g>
    </svg>
  );
}

/**
 * El glifo dentro de su placa oscura, como aparece en el login y en el riel.
 * Se agrupan porque siempre van juntos y repetir la placa en cada sitio
 * terminaría con tres bordes ligeramente distintos.
 */
export function GridMark({ size = 52, glyph = 30 }: { size?: number; glyph?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size >= 48 ? 15 : 11,
        background: "#0A1526",
        border: "1.5px solid rgba(50,214,107,.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <GridGlyph size={glyph} />
    </div>
  );
}
