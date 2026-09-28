import Link from "next/link";
import {
  listarManuales,
  seccionesExistentes,
} from "@/modules/biblioteca/infrastructure/documentos-manuales";
import { Icon } from "@/components/layout/icons";
import { PageHead } from "@/components/ui/PageHead";
import { FormularioDocumento } from "@/components/admin/FormularioDocumento";
import { FilaDocumento } from "@/components/admin/FilaDocumento";

export const revalidate = 0;

/**
 * Los documentos que se dieron de alta a mano.
 *
 * La biblioteca se llena desde el cronograma, y eso cubre lo que el área
 * planifica. Aquí va lo demás: un instructivo que nació fuera de la hoja, una
 * grabación, una plantilla que circuló por Slack.
 *
 * SOLO SE LISTA LO MANUAL. Los 153 del cronograma no se tocan desde aquí: se
 * corrigen en la hoja y se sincronizan. Mezclarlos daría a entender que se
 * pueden editar, y cualquier cambio duraría hasta la siguiente sincronización.
 */
export default async function AdminBibliotecaPage() {
  const [docs, secciones] = await Promise.all([listarManuales(), seccionesExistentes()]);

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
        icon="lib"
        title="Biblioteca"
        description="Sube documentos que no vienen del cronograma"
        accent="var(--kc-teal)"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 360px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ── Lo subido a mano ─────────────────────────────────────────── */}
        <div className="kc-panel kc-rise" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 17px", borderBottom: "1px solid #EDF2F7" }}>
            <h2
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--kc-ink)",
                margin: 0,
                letterSpacing: "-.016em",
              }}
            >
              Subidos desde aquí
            </h2>
            <p style={{ fontSize: 11, color: "var(--kc-ink-3)", margin: "3px 0 0", lineHeight: 1.5 }}>
              {docs.length === 0
                ? "Todavía no hay ninguno. Los del cronograma se corrigen en la hoja y se sincronizan."
                : `${docs.length} ${docs.length === 1 ? "documento" : "documentos"} · la sincronización no los toca`}
            </p>
          </div>

          {docs.map((d) => (
            <FilaDocumento key={d.id} doc={d} secciones={secciones} />
          ))}
        </div>

        {/* ── Subir uno nuevo ──────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormularioDocumento secciones={secciones} />

          <Link
            href="/biblioteca"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11,
              color: "var(--kc-ink-3)",
              textDecoration: "none",
              padding: "9px 12px",
              border: "1px solid var(--kc-line)",
              borderRadius: 9,
              background: "#fff",
            }}
          >
            <Icon name="lib" size={12} />
            Ver la biblioteca
          </Link>
        </div>
      </div>
    </div>
  );
}
