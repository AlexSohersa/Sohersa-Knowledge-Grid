import type { Metadata, Viewport } from "next";
import "@/styles/tokens.css";
import "@/styles/grid.css";

export const metadata: Metadata = {
  title: "Sohersa Knowledge Grid",
  description:
    "Manuales, estándares, herramientas, capacitaciones y la experiencia del equipo de SOHERSA.",
};

export const viewport: Viewport = {
  themeColor: "#07172B",
};

/**
 * El documento.
 *
 * La fuente se carga con `<link>` y no con `next/font` para que el CSS sea
 * exactamente el del diseño —Space Grotesk desde Google Fonts, con los mismos
 * pesos—. `preconnect` evita el salto de fuente en la primera carga.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
