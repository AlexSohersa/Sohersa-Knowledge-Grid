import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarColaboradores } from "@/modules/personas/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { PageHead } from "@/components/ui/PageHead";
import { TablaColaboradores } from "@/components/admin/TablaColaboradores";

export const revalidate = 0;

/**
 * El equipo y sus permisos.
 *
 * Las personas salen del PADRÓN del núcleo, así que aquí no se da de alta ni se
 * borra a nadie: eso lo hace el núcleo, y una lista propia sería otra copia del
 * mismo equipo que acabaría discrepando. Lo que sí vive aquí son los permisos.
 */
export default async function EquipoPage() {
  await exigirSesion();
  const colaboradores = await listarColaboradores();

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <Link
        href="/admin"
        className="kc-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid var(--kc-line)",
          background: "#fff",
          color: "var(--kc-ink-2)",
          fontSize: 11.5,
          fontWeight: 600,
          padding: "7px 11px",
          borderRadius: 9,
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <Icon name="back" size={12} />
        Administración
      </Link>

      <PageHead
        icon="me"
        title="El equipo"
        description="Quién administra, quién revisa el FAQ y qué ve cada quien"
        accent="var(--kc-teal)"
      />

      <TablaColaboradores colaboradores={colaboradores} />
    </div>
  );
}
