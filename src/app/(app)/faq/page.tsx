import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarFaqWired } from "@/modules/faq/infrastructure/wiring";
import { PageHead, EmptyState } from "@/components/ui/PageHead";
import { FaqAcordeon } from "@/components/faq/FaqAcordeon";

export const revalidate = 0;

/**
 * Preguntas frecuentes: la respuesta oficial de la empresa.
 *
 * Se distingue de Comunidad a propósito. Aquí está lo que la empresa sostiene
 * —revisado, con sus pasos—; allá está la conversación. Una pregunta de
 * comunidad bien resuelta puede promoverse aquí desde Administración.
 */
export default async function FaqPage() {
  const yo = await exigirSesion();
  const { categorias, total } = await listarFaqWired(yo.email);

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="faq"
        title="Preguntas frecuentes"
        description="Respuestas rápidas a las dudas que aparecen una y otra vez."
        accent="var(--kc-amber)"
        action={
          <Link
            href="/comunidad/preguntar"
            className="kc-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "1px solid var(--kc-line)",
              background: "#fff",
              color: "var(--kc-ink)",
              fontSize: 12,
              fontWeight: 600,
              padding: "9px 14px",
              borderRadius: 10,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ¿No está tu duda? Pregunta
          </Link>
        }
      />

      {total === 0 ? (
        <EmptyState
          title="Todavía no hay preguntas frecuentes"
          action={
            <Link
              href="/comunidad/preguntar"
              className="kc-btn"
              style={{
                display: "inline-flex",
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                padding: "11px 18px",
                borderRadius: 11,
                textDecoration: "none",
                boxShadow: "var(--kc-shadow-btn)",
              }}
            >
              Preguntar a la comunidad
            </Link>
          }
        >
          Las preguntas frecuentes las redacta Administración, o nacen de una pregunta
          de la comunidad que se resolvió bien y se promovió a respuesta oficial.
        </EmptyState>
      ) : (
        <FaqAcordeon categorias={categorias} />
      )}
    </div>
  );
}
