import { notFound } from "next/navigation";
import { exigirSesion } from "@/lib/grid/session";
import { verDocumentoWired } from "@/modules/biblioteca/infrastructure/wiring";
import { registrarVisitaWired, estaGuardadoWired } from "@/modules/personal/infrastructure/wiring";
import {
  estadoDocumento,
  estiloEstado,
  etiquetaEstado,
  modoApertura,
  urlDescargaDrive,
  urlPreviewDrive,
} from "@/modules/biblioteca/domain/documento";
import { estiloExt, extDeArchivo } from "@/modules/shared/domain/conocimiento";
import { haceCuanto, tamano } from "@/modules/shared/domain/formato";
import { ExtBadge } from "@/components/ui/Pill";
import { BotonGuardar } from "@/components/ui/BotonGuardar";
import { BotonVolver } from "@/components/ui/BotonVolver";

export const revalidate = 0;

/**
 * La ficha de un documento, con su visor.
 *
 * El documento se incrusta cuando vive en Drive: leerlo sin salir del Centro
 * conserva el contexto —de qué sección vengo, qué más había— que se pierde al
 * abrir una pestaña nueva. Cuando solo hay un enlace externo, se ofrece el
 * enlace y se dice claramente que abre fuera.
 */
export default async function DocumentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ de?: string; ref?: string }>;
}) {
  const { code } = await params;
  const { de, ref } = await searchParams;
  const yo = await exigirSesion();

  const doc = await verDocumentoWired(yo.email, decodeURIComponent(code));
  if (!doc) notFound();

  // Se registra la visita para el historial. No se espera a que termine con
  // `await` en la ruta crítica... pero en un Server Component sí hay que
  // esperarla: dejarla suelta la cancelaría al terminar la respuesta.
  await registrarVisitaWired(yo.email, "doc", doc.code ?? doc.id, doc.title);

  const guardado = await estaGuardadoWired(yo.email, "doc", doc.code ?? doc.id);

  const ext = extDeArchivo(doc.fileName, doc.mimeType);
  const estilo = estiloExt(ext);
  const estado = estadoDocumento(doc);
  const estiloEst = estiloEstado(estado);
  const modo = modoApertura(doc);

  return (
    <div style={{ padding: "24px 30px 44px" }}>
      {/* Volver: la ruta de regreso explícita, porque el visor ocupa la
          pantalla y el riel puede quedar lejos de la vista. A dónde vuelve
          depende de por dónde se entró: desde una ruta, a la ruta. */}
      <BotonVolver de={de} detalle={ref} porOmision={{ href: "/biblioteca", etiqueta: "Biblioteca" }} />

      <div
        className="kc-panel kc-rise"
        style={{ padding: "18px 20px", marginBottom: 18 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <ExtBadge ext={estilo.ext} soft={estilo.soft} ink={estilo.ink} size={46} />

          <div style={{ flex: 1, minWidth: 240 }}>
            {doc.code && (
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--kc-ink-4)" }}>
                {doc.code}
              </span>
            )}
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-.026em",
                color: "var(--kc-ink)",
                margin: "2px 0 0",
                lineHeight: 1.25,
              }}
            >
              {doc.title}
            </h1>
            <p style={{ fontSize: 12, color: "var(--kc-ink-3)", margin: "6px 0 0" }}>
              {[doc.section, doc.author, tamano(doc.sizeBytes), haceCuanto(doc.updatedAt)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            {/* El estado de elaboración solo lo ve quien puede: para el resto
                del equipo el documento simplemente está publicado. */}
            {doc.priority !== undefined && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: estiloEst.ink,
                  background: estiloEst.soft,
                  borderRadius: 7,
                  padding: "5px 10px",
                }}
              >
                {etiquetaEstado(estado)}
              </span>
            )}

            <BotonGuardar
              kind="doc"
              targetId={doc.code ?? doc.id}
              title={doc.title}
              guardadoInicial={guardado}
            />

            {doc.driveId && (
              <a
                href={urlDescargaDrive(doc.driveId)}
                target="_blank"
                rel="noreferrer"
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
                  padding: "9px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  boxShadow: "var(--kc-shadow-btn)",
                }}
              >
                Descargar
              </a>
            )}
          </div>
        </div>

        {/* Las notas del cronograma son información de gestión: solo llegan a
            quien puede verlas, así que basta comprobar si vinieron. */}
        {doc.notes && (
          <p
            style={{
              margin: "14px 0 0",
              padding: "10px 13px",
              background: "#FDF3DC",
              borderRadius: 10,
              fontSize: 12,
              color: "#8A6410",
              lineHeight: 1.55,
            }}
          >
            <strong>Nota del cronograma:</strong> {doc.notes}
          </p>
        )}
      </div>

      {/* ── El documento ─────────────────────────────────────────────────── */}
      {modo === "visor" && doc.driveId ? (
        <div
          className="kc-panel kc-rise"
          style={{ overflow: "hidden", animationDelay: ".05s" }}
        >
          <iframe
            src={urlPreviewDrive(doc.driveId)}
            title={doc.title}
            style={{ width: "100%", height: "72vh", border: "none", display: "block" }}
            allow="autoplay"
          />
        </div>
      ) : modo === "externo" && doc.url ? (
        <div className="kc-panel kc-rise" style={{ padding: "34px 26px", textAlign: "center" }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--kc-ink)", margin: 0 }}>
            Este documento vive fuera del Centro
          </p>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--kc-ink-3)",
              margin: "7px auto 16px",
              maxWidth: 420,
              lineHeight: 1.55,
            }}
          >
            No se puede incrustar aquí, así que se abre en una pestaña nueva con tu
            cuenta de Sohersa.
          </p>
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="kc-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
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
            Abrir documento
          </a>
        </div>
      ) : (
        <div className="kc-panel kc-rise" style={{ padding: "34px 26px", textAlign: "center" }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--kc-ink)", margin: 0 }}>
            El archivo todavía no está enlazado
          </p>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--kc-ink-3)",
              margin: "7px auto 0",
              maxWidth: 420,
              lineHeight: 1.55,
            }}
          >
            La ficha existe en el cronograma, pero aún no tiene documento asociado.
            Avisa a Transformación Digital si crees que debería estar.
          </p>
        </div>
      )}
    </div>
  );
}
