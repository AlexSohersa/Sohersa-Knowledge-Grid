// Módulo Personal · APLICACIÓN · Ports (contratos).

import type { KindId } from "@/modules/shared/domain/conocimiento";
import type { Guardado, Visto } from "../domain/guardado";

export interface RepositorioPersonal {
  listarGuardados(email: string, kind?: KindId): Promise<Guardado[]>;
  /** Cuántos guardados tiene, para la insignia de la barra superior. */
  contarGuardados(email: string): Promise<number>;
  /** Si un elemento concreto está guardado, para pintar el botón. */
  estaGuardado(email: string, kind: KindId, targetId: string): Promise<boolean>;

  /**
   * Guarda o quita. Devuelve el estado resultante para que la interfaz no tenga
   * que volver a preguntar.
   */
  alternarGuardado(
    email: string,
    kind: KindId,
    targetId: string,
    title: string,
  ): Promise<boolean>;

  listarHistorial(email: string, limite: number): Promise<Visto[]>;
  /** Registra que alguien abrió algo. Sobrescribe la visita anterior. */
  registrarVisita(email: string, kind: KindId, targetId: string, title: string): Promise<void>;
  limpiarHistorial(email: string): Promise<void>;
}
