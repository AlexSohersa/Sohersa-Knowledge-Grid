import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Los motores de Prisma tienen que viajar al servidor.
   *
   * Cada esquema genera su cliente en `node_modules/.prisma/client-*`, una ruta
   * que Next no reconoce como dependencia normal: al empaquetar para producción
   * dejaba fuera los binarios `.node` y en Vercel toda consulta fallaba con un
   * mensaje vacío, indistinguible de "no hay datos".
   *
   * `serverExternalPackages` evita que se intenten meter en el bundle, y
   * `outputFileTracingIncludes` los copia al paquete que se despliega.
   */
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/.prisma/client-grid/**",
      "./node_modules/.prisma/client-portal/**",
    ],
  },
};

export default nextConfig;
