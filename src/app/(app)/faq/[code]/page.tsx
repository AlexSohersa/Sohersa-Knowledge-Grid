import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirSeccion } from "@/lib/grid/session";
import {
  comentariosDeFichaWired,
  listarFaqWired,
} from "@/modules/faq/infrastructure/wiring";
import { registrarVisitaWired } from "@/modules/personal/infrastructure/wiring";
import { Icon } from "@/components/layout/icons";
import { FichaProblema } from "@/components/faq/FichaProblema";

export const revalidate = 0;

/**
 * La ficha de un problema.
 *
 * Se llega por CÓDIGO —`/faq/RVT-041`— y no por id: es como el equipo se
 * refiere a estas fichas entre sí, así que un enlace pegado en un chat se lee
 * y se entiende. Las FAQ escritas a mano no tienen código y se abren por su id,
 * que también se acepta aquí.
 */
export default async function FichaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const yo = await exigirSeccion("faq");

  const clave = decodeURIComponent(code);

  /*
   * Se pide la lista y se busca dentro, en vez de consultar por código.
   *
   * Son 78 fichas y la consulta ya trae el voto de quien mira; hacer una
   * segunda consulta por código obligaría a duplicar esa lógica en el
   * repositorio para ahorrar unos milisegundos sobre un conjunto que cabe
   * entero en memoria.
   */
  const { categorias } = await listarFaqWired(yo.email);
  const todas = categorias.flatMap((c) => c.items);

  const faq =
    todas.find((f) => f.code?.toUpperCase() === clave.toUpperCase()) ??
    todas.find((f) => f.id === clave);

  if (!faq) notFound();

  /*
   * Los comentarios ACEPTADOS de esta ficha se pintan debajo.
   *
   * Es lo que cierra el círculo: alguien comenta desde la ficha, el área lo
   * acepta, y el comentario aparece justo donde se escribió. Sin esto, aceptar
   * un comentario no dejaba rastro visible en ninguna parte.
   */
  const [comentarios] = await Promise.all([
    comentariosDeFichaWired(faq.id),
    registrarVisitaWired(yo.email, "faq", faq.code ?? faq.id, faq.question),
  ]);

  return (
    <div style={{ padding: "24px 32px 44px" }}>
      <Link
        href="/faq"
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
        Preguntas frecuentes
      </Link>

      <FichaProblema faq={faq} comentarios={comentarios} />
    </div>
  );
}
