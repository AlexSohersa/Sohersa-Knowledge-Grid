/**
 * El anillo de avance de la ruta.
 *
 * Es el elemento que ancla la pantalla: dice de un vistazo cuánto llevas, sin
 * leer un número entre texto. El arco empieza arriba y avanza en el sentido de
 * las manecillas, que es como se lee un progreso.
 *
 * Se dibuja con SVG y no con una barra porque un círculo comunica "camino
 * recorrido" mejor que una línea, y porque a este tamaño el porcentaje cabe
 * dentro y no hace falta ponerlo al lado.
 */
export function AnilloAvance({ pct, size = 116 }: { pct: number; size?: number }) {
  const grosor = 9;
  const radio = (size - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  // Cuánto del trazo se deja "sin pintar": es como se dibuja un arco parcial.
  const restante = circunferencia * (1 - Math.max(0, Math.min(100, pct)) / 100);

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
      role="img"
      aria-label={`${pct} por ciento completado`}
    >
      <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
        {/* El riel: el camino completo, apagado. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          fill="none"
          stroke="rgba(255,255,255,.12)"
          strokeWidth={grosor}
        />
        {/* El arco recorrido. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          fill="none"
          stroke="var(--kc-green)"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={restante}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <span
          style={{
            fontSize: size >= 110 ? 26 : 20,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-.04em",
            lineHeight: 1,
          }}
        >
          {pct}%
        </span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: ".14em",
            color: "var(--kc-dk-3)",
          }}
        >
          COMPLETADO
        </span>
      </div>
    </div>
  );
}
