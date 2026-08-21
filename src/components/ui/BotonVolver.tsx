import Link from "next/link";
import { Icon } from "@/components/layout/icons";
import { regresoDe, type Regreso } from "@/modules/shared/domain/procedencia";

/**
 * El botón de volver de una ficha.
 *
 * Nombra su destino en vez de decir "Atrás": quien entró desde su ruta lee
 * "Mi ruta" y sabe a dónde va a caer antes de pulsar. El destino sale del
 * `?de=` que trae la URL —lo cuelga `marcarOrigen` en el enlace de ida— y, si
 * no viene, del `porOmision` que pasa cada ficha: su propia sección.
 */
export function BotonVolver({
  de,
  detalle,
  porOmision,
}: {
  de?: string;
  /*
   * El dato extra del origen: para una ruta, `<ruta>:<etapa>`.
   *
   * NO se puede llamar `ref`: React la trata como palabra reservada y no la
   * entrega como una prop normal, así que el componente la recibía vacía y
   * React protestaba por pasar un ref a donde no lo admite.
   */
  detalle?: string;
  porOmision: Regreso;
}) {
  const destino = regresoDe(de, porOmision, detalle);

  return (
    <Link
      href={destino.href}
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
      {destino.etiqueta}
    </Link>
  );
}
