import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Rail, type RailItem } from "@/components/layout/Rail";
import { TopBar } from "@/components/layout/TopBar";
import { seccionesPermitidas, usuarioActual } from "@/lib/grid/session";
import { Campana } from "@/components/layout/Campana";
import {
  misAvisosWired,
  sinLeerWired,
} from "@/modules/notificaciones/infrastructure/wiring";
import { contarGuardadosWired } from "@/modules/personal/infrastructure/wiring";
import { misRutasWired } from "@/modules/rutas/infrastructure/wiring";
import { listarBibliotecaWired } from "@/modules/biblioteca/infrastructure/wiring";
import { listarCapacitacionesWired } from "@/modules/capacitaciones/infrastructure/wiring";

/**
 * El armazón de la aplicación: riel a la izquierda, contenido a la derecha.
 *
 * Los contadores del riel se calculan aquí, en el servidor, y bajan como datos.
 * Así el riel no consulta nada por su cuenta y las cifras que muestra son las
 * mismas que verá la pantalla al abrirla.
 *
 * Las cuatro consultas van en paralelo: son independientes entre sí y
 * encadenarlas sumaría sus tiempos sin motivo.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const yo = await usuarioActual();
  // El middleware ya exige sesión; esto cubre el hueco entre que caduca y que
  // se redirige, y hace que el resto del layout pueda dar por hecho que hay
  // persona.
  if (!yo) redirect("/login");

  const [guardados, rutas, biblioteca, capacitaciones, avisos, sinLeer, permitidas] = await Promise.all([
    contarGuardadosWired(yo.email),
    misRutasWired(yo.email),
    listarBibliotecaWired(yo.email),
    listarCapacitacionesWired(),
    misAvisosWired(yo.email),
    sinLeerWired(yo.email),
    seccionesPermitidas(yo.email),
  ]);

  /*
   * El porcentaje del riel es el de TODAS las rutas juntas.
   *
   * Alguien puede tener varias asignadas, y mostrar solo la de la primera
   * daría un número que no corresponde a lo que le falta en total.
   */
  const totalItems = rutas.reduce((n, r) => n + r.avance.total, 0);
  const totalHechos = rutas.reduce((n, r) => n + r.avance.hechos, 0);
  const pctGlobal = totalItems === 0 ? 0 : Math.round((totalHechos / totalItems) * 100);

  const principales: RailItem[] = [
    { href: "/", label: "Inicio", icon: "home" },
    {
      href: "/biblioteca",
      label: "Biblioteca",
      icon: "lib",
      badge: biblioteca.total > 0 ? String(biblioteca.total) : null,
    },
    { href: "/herramientas", label: "Herramientas", icon: "tool" },
    {
      href: "/capacitaciones",
      label: "Capacitaciones",
      icon: "cap",
      badge: capacitaciones.items.length > 0 ? String(capacitaciones.items.length) : null,
    },
    /*
     * "Mi ruta" solo se enciende para quien tiene una asignada. Apagarla —en vez
     * de esconderla— es deliberado: enseña que la sección existe y explica por
     * qué no está disponible, en lugar de dejar a la persona sin saber que
     * podría tener una.
     */
    rutas.length > 0
      ? {
          href: "/ruta",
          label: rutas.length > 1 ? "Mis rutas" : "Mi ruta",
          icon: "path",
          badge: `${pctGlobal}%`,
        }
      : {
          href: "/ruta",
          label: "Mi ruta",
          icon: "path",
          disabled: true,
          tip: "Aún no tienes una ruta asignada",
        },
    { href: "/faq", label: "FAQ", icon: "faq" },
    { href: "/comunidad", label: "Comunidad", icon: "com" },
  ];

  /*
   * Se quitan del riel las secciones restringidas.
   *
   * `permitidas` es `null` cuando no hay restricción, que es lo normal: el
   * Centro existe para que el conocimiento circule y limitar es la excepción.
   *
   * Esconder el enlace NO basta por sí solo —la dirección se puede escribir a
   * mano—, así que cada página restringible llama además a `exigirSeccion`.
   * Aquí solo se evita ofrecer un camino que va a acabar en un rebote.
   */
  const seccionDe: Record<string, string> = {
    "/biblioteca": "biblioteca",
    "/herramientas": "herramientas",
    "/capacitaciones": "capacitaciones",
    "/ruta": "ruta",
    "/faq": "faq",
    "/comunidad": "comunidad",
  };

  const visibles =
    permitidas === null
      ? principales
      : principales.filter((i) => {
          const seccion = seccionDe[i.href];
          return !seccion || permitidas.includes(seccion);
        });

  const secundarias: RailItem[] = [
    {
      href: "/guardados",
      label: "Guardados",
      icon: "star",
      badge: guardados > 0 ? String(guardados) : null,
    },
    { href: "/historial", label: "Historial", icon: "hist" },
    { href: "/aprendizaje", label: "Mi aprendizaje", icon: "me" },
    // Administración solo aparece para quien administra: aquí sí se esconde,
    // porque no es una sección a la que alguien pueda aspirar por su cuenta.
    ...(yo.isAdmin
      ? [{ href: "/admin", label: "Administración", icon: "adm" as const }]
      : []),
  ];

  return (
    <div className="kc-shell">
      <Rail
        principales={visibles}
        secundarias={secundarias}
        usuario={{
          name: yo.name,
          initials: yo.initials,
          photo: yo.photo,
          role: yo.role,
        }}
      />

      <div className="kc-main">
        {/*
         * La barra usa `useSearchParams` para reflejar la búsqueda activa, y
         * Next exige envolver en Suspense cualquier componente que lo haga: sin
         * esto, la página entera se renderizaría solo en el cliente y se
         * perdería el HTML del servidor.
         */}
        <Suspense
          fallback={
            <div
              style={{
                height: "var(--kc-topbar)",
                background: "#fff",
                borderBottom: "1px solid var(--kc-line)",
              }}
            />
          }
        >
          <TopBar guardados={guardados} avisos={<Campana avisos={avisos} sinLeer={sinLeer} />} />
        </Suspense>
        <main style={{ flex: 1, minHeight: 0 }}>{children}</main>
      </div>
    </div>
  );
}
