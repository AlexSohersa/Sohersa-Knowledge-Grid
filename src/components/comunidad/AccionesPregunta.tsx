"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { borrarPregunta, editarPregunta, quitarImagenPregunta } from "@/app/(app)/comunidad/acciones";
import type { ImagenPregunta } from "@/modules/comunidad/domain/pregunta";
import { SelectorImagenes } from "./SelectorImagenes";

/**
 * Editar o retirar una pregunta.
 *
 * QUIÉN PUEDE, y se decide en el servidor: quien la escribió, y quien
 * administra. Aquí solo se decide si se PINTAN los botones —esconderlos no
 * impediría llamar a la acción a mano, así que la comprobación de verdad está
 * en `acciones.ts`—.
 *
 * Editar faltaba y se notaba: una pregunta con una errata, o a la que se le
 * olvidó la captura, no tenía arreglo. La única salida era borrarla y
 * escribirla otra vez, perdiendo las respuestas que ya tuviera.
 */
export function AccionesPregunta({
  id,
  title,
  body,
  imagenes,
  puedeEditar,
  puedeBorrar,
}: {
  id: string;
  title: string;
  body: string;
  imagenes: ImagenPregunta[];
  puedeEditar: boolean;
  puedeBorrar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  if (!puedeEditar && !puedeBorrar) return null;

  async function guardar(form: FormData) {
    setError(null);
    const res = await editarPregunta(id, form);

    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar.");
      return;
    }

    setEditando(false);
    router.refresh();
  }

  function quitarCaptura(imagenId: string) {
    iniciar(async () => {
      const res = await quitarImagenPregunta(imagenId, id);
      if (!res.ok) setError(res.error ?? "No se pudo quitar.");
      else router.refresh();
    });
  }

  function eliminar() {
    /*
     * Dos pasos, y el segundo lo dice todo.
     *
     * Borrar una pregunta se lleva sus respuestas —el trabajo de otras
     * personas—, así que el aviso tiene que decir eso y no un «¿seguro?» que
     * no informa de nada. Se deshace solo a los 6 segundos: un aviso que se
     * queda encendido acaba pulsándose por inercia.
     */
    if (!confirmando) {
      setConfirmando(true);
      setTimeout(() => setConfirmando(false), 6000);
      return;
    }

    iniciar(async () => {
      const res = await borrarPregunta(id);
      if (res && !res.ok) {
        setError(res.error ?? "No se pudo borrar.");
        setConfirmando(false);
      }
    });
  }

  /* ── Editando ──────────────────────────────────────────────────────── */

  if (editando) {
    return (
      <form action={guardar} style={{ marginTop: 16 }}>
        {error && <p style={avisoError}>{error}</p>}

        <label style={etiqueta}>Título</label>
        <input name="title" required defaultValue={title} style={{ ...entrada, marginBottom: 10 }} />

        <label style={etiqueta}>En qué consiste</label>
        <textarea
          name="body"
          required
          rows={6}
          defaultValue={body}
          style={{ ...entrada, lineHeight: 1.6, resize: "vertical", marginBottom: 12 }}
        />

        {imagenes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={etiqueta}>Capturas actuales</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {imagenes.map((img) => (
                <span key={img.id} style={{ position: "relative", lineHeight: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/imagen/${img.driveId}`}
                    alt={img.fileName ?? "Captura"}
                    style={{
                      width: 84,
                      height: 62,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid var(--kc-line)",
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => quitarCaptura(img.id)}
                    disabled={pendiente}
                    aria-label={`Quitar ${img.fileName ?? "captura"}`}
                    title="Quitar de la pregunta"
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "1px solid var(--kc-line)",
                      background: "#fff",
                      color: "#B3383F",
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: "6px 0 0" }}>
              Quitarlas de aquí no las borra de Drive.
            </p>
          </div>
        )}

        <SelectorImagenes etiqueta="Añadir capturas" ayuda="Opcional" />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={pendiente}
            className="kc-btn"
            style={{ ...boton, background: "var(--kc-green-solid,#178A49)", color: "#fff", border: "none" }}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setError(null);
            }}
            className="kc-btn"
            style={boton}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  /* ── En reposo ─────────────────────────────────────────────────────── */

  return (
    <div style={{ marginTop: 14 }}>
      {error && <p style={avisoError}>{error}</p>}

      {confirmando && (
        <p style={avisoBorrado}>
          <strong>Se va a borrar esta pregunta.</strong> Se irán también sus{" "}
          {imagenes.length > 0 ? "capturas y " : ""}respuestas, incluido lo que hayan
          escrito otras personas. No se puede deshacer.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {puedeEditar && (
          <button type="button" onClick={() => setEditando(true)} className="kc-btn" style={boton}>
            Editar
          </button>
        )}

        {puedeBorrar && (
          <button
            type="button"
            onClick={eliminar}
            disabled={pendiente}
            className="kc-btn"
            style={{
              ...boton,
              border: `1px solid ${confirmando ? "rgba(194,56,64,.45)" : "var(--kc-line)"}`,
              background: confirmando ? "#FCE9EA" : "#fff",
              color: confirmando ? "#C23840" : "var(--kc-ink-3)",
            }}
          >
            {pendiente ? "Borrando…" : confirmando ? "Sí, borrar la pregunta" : "Borrar"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Estilos ─────────────────────────────────────────────────────────── */

const entrada: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--kc-line)",
  borderRadius: 9,
  padding: "9px 11px",
  fontSize: 13,
  color: "var(--kc-ink)",
  background: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const etiqueta: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--kc-ink-2)",
  marginBottom: 5,
};

const boton: React.CSSProperties = {
  border: "1px solid var(--kc-line)",
  background: "#fff",
  color: "var(--kc-ink-2)",
  fontSize: 11.5,
  fontWeight: 600,
  padding: "7px 13px",
  borderRadius: 9,
  cursor: "pointer",
};

const avisoError: React.CSSProperties = {
  margin: "0 0 10px",
  padding: "8px 11px",
  background: "#FCE9EA",
  color: "#B3383F",
  borderRadius: 8,
  fontSize: 12,
  lineHeight: 1.5,
};

const avisoBorrado: React.CSSProperties = {
  margin: "0 0 10px",
  padding: "10px 12px",
  background: "#FCE9EA",
  color: "#8F2D33",
  borderRadius: 9,
  fontSize: 12,
  lineHeight: 1.55,
};
