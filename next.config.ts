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

  experimental: {
    serverActions: {
      /*
       * El tope de subida, alineado con lo que acepta el código.
       *
       * Next limita a 1 MB el cuerpo de una Server Action para que nadie tumbe
       * el servidor mandando archivos enormes. Ese tope es sensato como
       * defecto, pero se queda corto para una captura de pantalla: una de
       * pantalla completa a doble resolución pasa del mega con facilidad, y el
       * error que salía —«Body exceeded 1 MB limit»— aparecía DESPUÉS de
       * rellenar todo el formulario.
       *
       * Se pone en 10 MB, un poco por encima de los 8 MB que valida
       * `subirCaptura`: así quien se pasa recibe el mensaje claro de la
       * aplicación —«la imagen pesa demasiado»— en vez del error crudo de Next.
       */
      bodySizeLimit: "10mb",
    },
  },
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/.prisma/client-grid/**",
      "./node_modules/.prisma/client-portal/**",
    ],
  },
};

export default nextConfig;
