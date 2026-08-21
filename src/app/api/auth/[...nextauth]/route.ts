import { handlers } from "@/lib/auth";

/**
 * Las rutas de NextAuth: `/api/auth/*`.
 *
 * `handlers` trae los dos verbos; se reexportan por separado porque es lo que
 * espera el enrutador de Next.
 */
export const { GET, POST } = handlers;
