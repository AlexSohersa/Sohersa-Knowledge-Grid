import Link from "next/link";
import { exigirSesion } from "@/lib/grid/session";
import { listarFaqWired } from "@/modules/faq/infrastructure/wiring";
import { PageHead, EmptyState } from "@/components/ui/PageHead";
import { FaqExplorador } from "@/components/faq/FaqExplorador";

export const revalidate = 0;

/**
 * Preguntas frecuentes: la respuesta oficial de la empresa.
 *
 * Se distingue de Comunidad a propósito. Aquí está lo que la empresa sostiene
 * —revisado, con sus pasos—; allá está la conversación. Una pregunta de
 * comunidad bien resuelta puede promoverse aquí desde Administración.
 *
 * La pantalla sigue el borrador de Estandarización y Calidad: filtros a la
 * izquierda —plataforma y categoría— y los resultados a la derecha, cada uno
 * con su código y su botón de entrar.
 */
export default async function FaqPage() {
  const yo = await exigirSesion();
  const { categorias, total } = await listarFaqWired(yo.email);

  // La pantalla filtra por su cuenta; se le pasa el catálogo entero.
  const faqs = categorias.flatMap((c) => c.items);

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <PageHead
        icon="faq"
        title="Preguntas frecuentes"
        description="Los problemas que ya le pasaron a alguien más, con su solución."
        accent="var(--kc-amber)"
        action={
          <Link
            href="/faq/proponer"
            className="kc-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "none",
              background: "var(--kc-green-solid)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "9px 15px",
              borderRadius: 10,
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "var(--kc-shadow-btn)",
            }}
          >
            Agregar FAQ
          </Link>
        }
      />

      {total === 0 ? (
        <EmptyState
          title="Todavía no hay preguntas frecuentes"
          action={
            <Link
              href="/faq/proponer"
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
              Proponer la primera
            </Link>
          }
        >
          Las fichas las mantiene Estandarización y Calidad, y cualquiera puede
          proponer una: si un problema te costó resolverlo, a alguien más le va a
          costar lo mismo.
        </EmptyState>
      ) : (
        <FaqExplorador faqs={faqs} />
      )}
    </div>
  );
}
