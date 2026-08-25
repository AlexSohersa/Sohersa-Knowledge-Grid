import Link from "next/link";
import { areasDelPadron, exigirSeccion } from "@/lib/grid/session";
import { listarFaqWired } from "@/modules/faq/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { FormularioComentario } from "@/components/faq/FormularioComentario";

export const revalidate = 0;

/**
 * Comentarios al área de Estandarización y Calidad.
 *
 * Se llega desde el botón «Comentar» de una ficha —y entonces el comentario
 * queda ligado a ella— o desde el propio FAQ, sin ficha concreta.
 */
export default async function ComentarPage({
  searchParams,
}: {
  searchParams: Promise<{ faq?: string }>;
}) {
  const yo = await exigirSeccion("faq");
  const { faq: faqId } = await searchParams;
  const areas = await areasDelPadron();

  /*
   * Si se llegó desde una ficha, se busca para poder nombrarla en pantalla:
   * un comentario que dice «sobre RVT-041» le ahorra al área tener que
   * adivinar de qué se está hablando.
   */
  let sobre: { code: string | null; question: string } | null = null;
  if (faqId) {
    const { categorias } = await listarFaqWired(yo.email);
    const f = categorias.flatMap((c) => c.items).find((x) => x.id === faqId);
    if (f) sobre = { code: f.code, question: f.question };
  }

  return (
    <div style={{ padding: "24px 32px 44px", maxWidth: 760 }}>
      <Link
        href={sobre && faqId ? `/faq/${sobre.code ?? faqId}` : "/faq"}
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
          marginBottom: 18,
        }}
      >
        <Icon name="back" size={12} />
        {sobre ? "Volver a la ficha" : "Preguntas frecuentes"}
      </Link>

      <h1
        style={{
          fontSize: 21,
          fontWeight: 700,
          letterSpacing: "-.028em",
          color: "var(--kc-ink)",
          margin: "0 0 7px",
        }}
      >
        Comentarios
      </h1>
      <p style={{ fontSize: 13, color: "var(--kc-ink-3)", margin: "0 0 22px", lineHeight: 1.6, maxWidth: 560 }}>
        Para reportar un error en una ficha, sugerir una mejora o pedir que se
        documente algo. Lo recibe el área de Estandarización y Calidad.
      </p>

      <FormularioComentario
        faqId={faqId ?? null}
        sobre={sobre}
        autor={{ nombre: yo.name, area: yo.area }}
        areas={areas}
      />
    </div>
  );
}
