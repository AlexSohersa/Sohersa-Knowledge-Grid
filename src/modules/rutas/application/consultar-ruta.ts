// Módulo Rutas · APLICACIÓN · Casos de uso.

import {
  avanceRuta,
  estadoEtapa,
  type AvanceRuta,
  type EstadoEtapa,
  type Ruta,
  type RutaAsignada,
} from "../domain/ruta";
import type {
  AsignacionConAvance,
  DatosEtapa,
  DatosItemRuta,
  DatosRuta,
  RegistroAvance,
  RepositorioAvanceRuta,
  RepositorioRutas,
} from "./ports";

export interface Deps {
  repo: RepositorioRutas;
  avance: RepositorioAvanceRuta;
}

/** Una ruta lista para pintar: estructura + avance + estados de etapa. */
export interface VistaRuta {
  assignmentId: string;
  asignada: RutaAsignada;
  avance: AvanceRuta;
  /** El estado de cada etapa, en el mismo orden que las etapas. */
  estados: EstadoEtapa[];
}

/**
 * Las rutas de una persona, con su avance real.
 *
 * Devuelve TODAS las activas: alguien puede estar recorriendo la ruta de
 * coordinación y a la vez una de liderazgo, y esconder una de las dos haría
 * que pareciera que no existe.
 */
export async function misRutas({ repo }: Deps, email: string): Promise<VistaRuta[]> {
  const asignaciones = await repo.misRutas(email);

  return asignaciones.map(({ assignmentId, asignada, avance }) => {
    const conAvance = aplicarAvance(asignada.ruta, avance);
    return {
      assignmentId,
      asignada: { ...asignada, ruta: conAvance },
      avance: avanceRuta(conAvance),
      estados: conAvance.etapas.map((_, i) => estadoEtapa(conAvance, i)),
    };
  });
}

/** Una ruta concreta de esta persona, por id de ruta. */
export async function miRuta(
  deps: Deps,
  email: string,
  pathId?: string,
): Promise<VistaRuta | null> {
  const rutas = await misRutas(deps, email);
  if (rutas.length === 0) return null;
  if (!pathId) return rutas[0];
  return rutas.find((r) => r.asignada.ruta.id === pathId) ?? null;
}

/**
 * Vuelca el avance guardado sobre la estructura de la ruta.
 *
 * Es pura: recibe la ruta y las filas de avance, y devuelve una copia con
 * `completado`, `descargado` y `segundos` rellenos. Al no tocar nada de fuera,
 * se puede probar con objetos literales.
 */
function aplicarAvance(ruta: Ruta, registros: RegistroAvance[]): Ruta {
  // Índice por (elemento, tema) para no recorrer la lista en cada consulta.
  const porClave = new Map<string, RegistroAvance>();
  for (const r of registros) {
    porClave.set(`${r.itemId}|${r.topicId ?? ""}`, r);
  }

  return {
    ...ruta,
    etapas: ruta.etapas.map((etapa) => ({
      ...etapa,
      items: etapa.items.map((item) => {
        const propio = porClave.get(`${item.id}|`);

        return {
          ...item,
          temas: item.temas.map((tema) => {
            const t = porClave.get(`${item.id}|${tema.id}`);
            return {
              ...tema,
              completado: t?.completed ?? false,
              descargado: t?.downloaded ?? false,
              segundos: t?.seconds ?? 0,
            };
          }),
          completado: propio?.completed ?? false,
          descargado: propio?.downloaded ?? false,
        };
      }),
    })),
  };
}

/* ── Escritura del avance ───────────────────────────────────────────────── */

export type Resultado = { ok: boolean; error?: string };

/**
 * Marca un elemento —o un tema suyo— como hecho.
 *
 * Se comprueba que la asignación sea de QUIEN llama antes de escribir: sin
 * eso, cualquiera podría completar la ruta de otra persona pasando un id.
 */
export async function marcarAvance(
  { avance }: Deps,
  email: string,
  pathId: string,
  itemId: string,
  topicId: string | null,
  completado: boolean,
): Promise<Resultado> {
  const assignmentId = await avance.asignacionDe(email, pathId);
  if (!assignmentId) {
    return { ok: false, error: "Esta ruta no está asignada a ti." };
  }

  await avance.marcar(assignmentId, itemId, topicId, completado);
  return { ok: true };
}

/** Registra que se descargó el material de un elemento. */
export async function registrarDescarga(
  { avance }: Deps,
  email: string,
  pathId: string,
  itemId: string,
  topicId: string | null,
): Promise<Resultado> {
  const assignmentId = await avance.asignacionDe(email, pathId);
  if (!assignmentId) return { ok: false, error: "Esta ruta no está asignada a ti." };

  await avance.marcarDescarga(assignmentId, itemId, topicId);
  return { ok: true };
}

/**
 * Guarda dónde se quedó el video.
 *
 * Se descartan los primeros segundos: si alguien abre y cierra enseguida, no
 * tiene sentido reanudar en el segundo 3, y guardar eso solo añade escrituras.
 */
export async function guardarPosicion(
  { avance }: Deps,
  email: string,
  pathId: string,
  itemId: string,
  topicId: string | null,
  segundos: number,
): Promise<Resultado> {
  if (segundos < 5) return { ok: true };

  const assignmentId = await avance.asignacionDe(email, pathId);
  if (!assignmentId) return { ok: false, error: "Esta ruta no está asignada a ti." };

  await avance.guardarPosicion(assignmentId, itemId, topicId, Math.floor(segundos));
  return { ok: true };
}

/* ── Administración ─────────────────────────────────────────────────────── */

export async function listarRutas({ repo }: Deps): Promise<Ruta[]> {
  return repo.listar();
}

export async function verRuta({ repo }: Deps, id: string): Promise<Ruta | null> {
  return repo.porId(id);
}

export async function crearRuta(
  { repo }: Deps,
  datos: DatosRuta,
  creadaPor: string,
): Promise<string> {
  return repo.crear(datos, creadaPor);
}

export async function editarRuta(
  { repo }: Deps,
  id: string,
  datos: Partial<DatosRuta>,
): Promise<void> {
  await repo.editar(id, datos);
}

export async function eliminarRuta({ repo }: Deps, id: string): Promise<void> {
  await repo.eliminar(id);
}

export async function agregarEtapa(
  { repo }: Deps,
  rutaId: string,
  datos: DatosEtapa,
): Promise<string> {
  return repo.agregarEtapa(rutaId, datos);
}

export async function editarEtapa(
  { repo }: Deps,
  etapaId: string,
  datos: Partial<DatosEtapa>,
): Promise<void> {
  await repo.editarEtapa(etapaId, datos);
}

export async function eliminarEtapa({ repo }: Deps, etapaId: string): Promise<void> {
  await repo.eliminarEtapa(etapaId);
}

export async function agregarItem(
  { repo }: Deps,
  etapaId: string,
  datos: DatosItemRuta,
): Promise<string> {
  return repo.agregarItem(etapaId, datos);
}

export async function eliminarItem({ repo }: Deps, itemId: string): Promise<void> {
  await repo.eliminarItem(itemId);
}

/**
 * Asignar una ruta a alguien.
 *
 * Asignar la misma ruta dos veces no crea dos asignaciones: la clave
 * (persona, ruta) es única y el repositorio hace upsert. Importa porque el
 * mismo administrador puede volver a la pantalla y pulsar de nuevo sin querer.
 */
export async function asignarRuta(
  { repo }: Deps,
  rutaId: string,
  email: string,
  asignadaPor: string,
): Promise<void> {
  await repo.asignar(rutaId, email, asignadaPor);
}

export async function desasignarRuta(
  { repo }: Deps,
  rutaId: string,
  email: string,
): Promise<void> {
  await repo.desasignar(rutaId, email);
}

export async function asignadosDeRuta({ repo }: Deps, rutaId: string): Promise<string[]> {
  return repo.asignados(rutaId);
}

export type { AsignacionConAvance };
