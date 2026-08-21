// Módulo Biblioteca · APLICACIÓN · Ports (contratos).
//
// Los ports son las interfaces que la aplicación necesita para trabajar. La
// aplicación depende de ESTAS interfaces, no de Prisma; la infraestructura las
// implementa. Eso es lo que hace al módulo testeable —se le puede pasar un
// repositorio falso— y separable de la base que hay debajo.

import type { Documento } from "../domain/documento";

/** Una automatización: script de Dynamo, paquete, complemento. */
export interface Automatizacion {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  fileName: string;
  url: string | null;
  version: string | null;
  compat: string | null;
  sizeBytes: number;
  downloads: number;
  createdBy: string;
  updatedAt: Date;
}

/** Filtros de la biblioteca. Todos opcionales: sin ninguno, se ve todo. */
export interface FiltrosBiblioteca {
  /** Texto libre. Se compara sin acentos contra varios campos. */
  busqueda?: string;
  /** Una sección concreta del cronograma. */
  seccion?: string;
  /** Extensión: PDF, XLS, RVT… */
  extension?: string;
  /** Autor del documento. */
  autor?: string;
}

/**
 * PORT principal: lo que la aplicación necesita de la biblioteca.
 *
 * Solo LECTURA, y no por olvido: los manuales los mantiene Digital Core
 * sincronizando el cronograma desde Google Sheets. Si Knowledge Grid pudiera
 * escribirlos, la siguiente sincronización pisaría el cambio y el usuario vería
 * su edición desaparecer sin explicación.
 */
export interface RepositorioBiblioteca {
  /**
   * Los documentos que puede ver esta persona, ya agrupados por sección.
   *
   * `verInterno` decide si vienen los campos de gestión. Se pasa como argumento
   * en vez de resolverlo dentro para que el caso de uso sea el único que decide
   * sobre permisos, y se pueda probar ambas ramas sin tocar la sesión.
   */
  listar(filtros: FiltrosBiblioteca, verInterno: boolean): Promise<Documento[]>;

  /** Un documento por su código del cronograma ("4.1"). */
  porCodigo(code: string, verInterno: boolean): Promise<Documento | null>;

  /** Un documento por su id. */
  porId(id: string, verInterno: boolean): Promise<Documento | null>;

  /** Las automatizaciones subidas a la plataforma. */
  listarAutomatizaciones(categoria?: string): Promise<Automatizacion[]>;

  /** Cuándo se sincronizó el cronograma por última vez con éxito. */
  ultimaSincronizacion(): Promise<Date | null>;
}

/**
 * PORT de permisos: si esta persona ve los campos de gestión.
 *
 * Se declara como contrato en vez de consultarlo directamente porque la
 * respuesta vive en OTRA base —el portal— y la aplicación no debe saberlo. Hoy
 * lo implementa una consulta a `TeamMember`; mañana podría venir de un servicio
 * y los casos de uso no se enterarían.
 */
export interface PermisosBiblioteca {
  puedeVerInterno(email: string): Promise<boolean>;
}
