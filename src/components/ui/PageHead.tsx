import { Icon, type IconName } from "@/components/layout/icons";

/**
 * El encabezado de una sección: icono, título, explicación y acciones.
 *
 * Lo comparten todas las pantallas para que el aire de arriba sea siempre el
 * mismo. El `accent` colorea el icono, y es el color del dominio al que
 * pertenece la sección.
 */
export function PageHead({
  icon,
  title,
  description,
  accent = "var(--kc-green)",
  action,
}: {
  icon: IconName;
  title: string;
  description?: string;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <header
      className="kc-rise"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${accent}1F`,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={19} />
      </span>

      <div style={{ flex: 1, minWidth: 240 }}>
        <h1
          style={{
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: "-.028em",
            color: "var(--kc-ink)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: 13,
              color: "var(--kc-ink-3)",
              margin: "5px 0 0",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {action && <div style={{ display: "flex", gap: 9, flexShrink: 0 }}>{action}</div>}
    </header>
  );
}

/**
 * El estado vacío: cuando una sección no tiene nada que mostrar.
 *
 * Siempre dice qué hacer a continuación, no solo que está vacío. Un "no hay
 * nada" sin salida deja a la persona sin saber si es un error o si le falta un
 * permiso.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="kc-panel kc-rise"
      style={{ padding: "40px 26px", textAlign: "center" }}
    >
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "var(--kc-ink)",
          margin: 0,
          letterSpacing: "-.018em",
        }}
      >
        {title}
      </p>
      {children && (
        <div
          style={{
            fontSize: 13,
            color: "var(--kc-ink-3)",
            margin: "7px auto 0",
            maxWidth: 430,
            lineHeight: 1.55,
          }}
        >
          {children}
        </div>
      )}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
