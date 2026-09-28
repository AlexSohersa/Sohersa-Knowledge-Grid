import Link from "next/link";
import { exigirSeccion } from "@/lib/grid/session";
import { listarBibliotecaWired } from "@/modules/biblioteca/infrastructure/wiring";
import { listarGuardadosWired } from "@/modules/personal/infrastructure/wiring";
import { haceCuanto } from "@/modules/shared/domain/formato";
import { BibliotecaExplorador } from "@/components/biblioteca/BibliotecaExplorador";
import { BotonSincronizar } from "@/components/biblioteca/BotonSincronizar";
import { EmptyState } from "@/components/ui/PageHead";

/*
 * Sin caché: el cronograma se sincroniza desde aquí o desde Digital Core en
 * cualquier momento, y una biblioteca servida de caché podría no mostrar un
 * estándar recién publicado —justo lo que alguien vino a buscar—.
 */
export const revalidate = 0;

/**
 * La biblioteca: manuales, instructivos, estándares y plantillas.
 *
 * Es la parte migrada de Recursos (Digital Core) y funciona igual: mismas
 * secciones, mismo orden del cronograma, misma regla de campos internos y la
 * misma sincronización con Google Sheets + Drive.
 */
export default async function BibliotecaPage() {
  const yo = await exigirSeccion("biblioteca");

  const [{ secciones, total, ultimaSync }, guardados] = await Promise.all([
    listarBibliotecaWired(yo.email),
    listarGuardadosWired(yo.email, "doc"),
  ]);

  return (
    <div style={{ padding: "24px 30px 44px" }}>
      <div
        className="kc-rise"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-.03em",
              color: "var(--kc-ink)",
              margin: 0,
            }}
          >
            Biblioteca
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--kc-ink-3)", margin: "5px 0 0" }}>
            Manuales, instructivos, estándares, plantillas y material de capacitación
          </p>
        </div>

        <span
          style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 11, color: "var(--kc-ink-4)" }}>
            {total} {total === 1 ? "documento" : "documentos"}
            {ultimaSync ? ` · actualizado ${haceCuanto(ultimaSync)}` : ""}
          </span>
          <BotonSincronizar />

          {/*
            «Subir» solo para quien administra.

            La pantalla para dar de alta un documento vive en Administración, y
            sin este atajo había que explicarle a cada persona dónde está. Aquí
            queda junto a Sincronizar, que es el otro botón que trae material a
            la biblioteca: los dos hacen lo mismo por caminos distintos.
          */}
          {yo.isAdmin && (
            <Link
              href="/admin/biblioteca"
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
                padding: "7px 12px",
                borderRadius: 9,
                textDecoration: "none",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V7m0 0-4 4m4-4 4 4M4 5h16" />
              </svg>
              Subir
            </Link>
          )}
        </span>
      </div>


      {total === 0 ? (
        <EmptyState title="La biblioteca está vacía">
          Pulsa <strong>Sincronizar</strong> para traer el Cronograma de Estandarización
          desde Google. Se lee con tu cuenta, así que verás los documentos a los que ya
          tienes acceso en Drive.
        </EmptyState>
      ) : (
        <BibliotecaExplorador
          secciones={secciones}
          guardados={guardados.items.map((g) => g.targetId)}
        />
      )}
    </div>
  );
}
