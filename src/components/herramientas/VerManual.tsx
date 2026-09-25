"use client";

import { useState } from "react";
import { VisorDocumento } from "@/components/biblioteca/VisorDocumento";
import type { Documento } from "@/modules/biblioteca/domain/documento";
import type { Herramienta } from "@/modules/herramientas/domain/herramienta";

/**
 * «Ver» el manual de una herramienta.
 *
 * Abre el visor de la biblioteca tal cual —zoom, descargar, abrir en Drive,
 * panel de información— para que un manual se lea igual venga de donde venga.
 * El manual se presenta al visor como un documento más.
 */
export function VerManual({ h, style }: { h: Herramienta; style: React.CSSProperties }) {
  const [abierto, setAbierto] = useState(false);

  const doc: Documento = {
    id: h.id,
    code: null,
    title: `Manual de ${h.name}`,
    section: "Herramientas",
    fileName: h.manualFileName,
    driveId: h.manualDriveId,
    url: h.manualUrl,
    mimeType: null,
    sizeBytes: null,
    author: null,
    training: null,
    origin: "tool",
    updatedAt: h.updatedAt,
  };

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="kc-btn" style={style}>
        Ver
      </button>
      {abierto && (
        <VisorDocumento doc={doc} volverA={h.name} onCerrar={() => setAbierto(false)} />
      )}
    </>
  );
}
