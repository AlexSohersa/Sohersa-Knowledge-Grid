/**
 * Las píldoras del Centro: la etiqueta pequeña de color que clasifica algo.
 *
 * Se centraliza porque el diseño las usa en todas las pantallas con exactamente
 * la misma forma —11.5px, peso 600, radio 7— y tenerlas sueltas acabaría con
 * quince variantes ligeramente distintas.
 */
export function Pill({
  children,
  soft,
  ink,
  size = "md",
  title,
}: {
  children: React.ReactNode;
  soft: string;
  ink: string;
  size?: "sm" | "md";
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: size === "sm" ? 9.5 : 11.5,
        fontWeight: 600,
        color: ink,
        background: soft,
        borderRadius: 7,
        padding: size === "sm" ? "2px 7px" : "4px 10px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

/**
 * La píldora cuadrada de extensión: PDF, XLS, RVT.
 *
 * Es distinta de `Pill` porque el diseño la dibuja como una placa de ancho fijo
 * a la izquierda de cada fila, y esa columna alineada es lo que hace que un
 * listado largo se lea de un vistazo.
 */
export function ExtBadge({
  ext,
  soft,
  ink,
  size = 38,
}: {
  ext: string;
  soft: string;
  ink: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: soft,
        color: ink,
        fontSize: size >= 38 ? 10 : 9,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        letterSpacing: ".02em",
      }}
    >
      {ext}
    </span>
  );
}

/** El punto de color que precede al nombre de una sección. */
export function Dot({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 0 3px ${color}28`,
      }}
    />
  );
}
