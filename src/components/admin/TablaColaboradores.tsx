"use client";

import { useMemo, useState, useTransition } from "react";
import { guardarPermisosDe } from "@/app/(app)/admin/acciones";
import {
  porArea,
  resumenAcceso,
  SECCIONES,
  type Colaborador,
  type Seccion,
} from "@/modules/personas/domain/permisos";

/**
 * El equipo y lo que puede hacer cada quien.
 *
 * La gente sale del PADRÓN, así que aquí no se da de alta ni se borra a nadie:
 * eso lo hace el núcleo y duplicarlo crearía dos listas del mismo equipo que
 * acabarían discrepando. Lo que sí se administra son los permisos.
 */
export function TablaColaboradores({ colaboradores }: { colaboradores: Colaborador[] }) {
  const [q, setQ] = useState("");
  const [soloConPermisos, setSoloConPermisos] = useState(false);

  const visibles = useMemo(() => {
    const aguja = q.trim().toLowerCase();

    return colaboradores.filter((c) => {
      if (soloConPermisos && !c.permisos.esAdmin && !c.permisos.revisaFaq) return false;
      if (!aguja) return true;
      return [c.nombre, c.correo, c.puesto ?? "", c.area ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(aguja);
    });
  }, [colaboradores, q, soloConPermisos]);

  const grupos = useMemo(() => porArea(visibles), [visibles]);

  const admins = colaboradores.filter((c) => c.permisos.esAdmin).length;
  const revisores = colaboradores.filter((c) => c.permisos.revisaFaq).length;

  return (
    <div>
      {/* Un resumen antes de la lista: responde de un vistazo «¿quién manda?». */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Dato n={colaboradores.length} texto="en el padrón" />
        <Dato n={admins} texto={admins === 1 ? "administra" : "administran"} />
        <Dato n={revisores} texto={revisores === 1 ? "revisa el FAQ" : "revisan el FAQ"} />
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo, puesto o área…"
          style={{
            flex: 1,
            minWidth: 240,
            fontSize: 12.5,
            fontFamily: "var(--kc-font)",
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid var(--kc-line)",
            background: "#fff",
            color: "var(--kc-ink)",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={() => setSoloConPermisos((v) => !v)}
          className="kc-btn"
          style={{
            border: `1px solid ${soloConPermisos ? "var(--kc-green-solid)" : "var(--kc-line)"}`,
            background: soloConPermisos ? "var(--kc-cap-soft)" : "#fff",
            color: soloConPermisos ? "var(--kc-cap-ink)" : "var(--kc-ink-3)",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "9px 14px",
            borderRadius: 10,
          }}
        >
          Solo con permisos
        </button>
      </div>

      {grupos.length === 0 ? (
        <p className="kc-panel" style={{ padding: "28px 20px", textAlign: "center", fontSize: 12.5, color: "var(--kc-ink-4)", margin: 0 }}>
          Nadie coincide con la búsqueda.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {grupos.map((g) => (
            <section key={g.area}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <h3 style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", color: "var(--kc-ink-4)", margin: 0 }}>
                  {g.area.toUpperCase()}
                </h3>
                <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)" }}>{g.gente.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {g.gente.map((c) => (
                  <FilaColaborador key={c.personaId} colaborador={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Dato({ n, texto }: { n: number; texto: string }) {
  return (
    <div
      className="kc-panel"
      style={{ padding: "10px 15px", display: "flex", alignItems: "baseline", gap: 7 }}
    >
      <span style={{ fontSize: 17, fontWeight: 700, color: "var(--kc-ink)", fontVariantNumeric: "tabular-nums" }}>
        {n}
      </span>
      <span style={{ fontSize: 11.5, color: "var(--kc-ink-4)" }}>{texto}</span>
    </div>
  );
}

/** Una persona, con sus permisos desplegables. */
function FilaColaborador({ colaborador }: { colaborador: Colaborador }) {
  const [abierto, setAbierto] = useState(false);
  const [p, setP] = useState({
    esAdmin: colaborador.permisos.esAdmin,
    revisaFaq: colaborador.permisos.revisaFaq,
    secciones: colaborador.permisos.secciones as string[],
  });
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function alternarSeccion(s: Seccion) {
    setP((prev) => ({
      ...prev,
      secciones: prev.secciones.includes(s)
        ? prev.secciones.filter((x) => x !== s)
        : [...prev.secciones, s],
    }));
    setGuardado(false);
  }

  function guardar() {
    setError(null);
    iniciar(async () => {
      const res = await guardarPermisosDe(colaborador.correo, p);
      if (res.ok) setGuardado(true);
      else setError(res.error ?? "No se pudo guardar.");
    });
  }

  const iniciales = colaborador.nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

  return (
    <div className="kc-panel" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="kc-row-h"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          width: "100%",
          border: "none",
          background: "transparent",
          padding: "10px 14px",
          textAlign: "left",
          fontFamily: "var(--kc-font)",
          cursor: "pointer",
        }}
      >
        {colaborador.foto ? (
          /* La foto viene del padrón, ya alojada por Google: no hay nada que
             optimizar en el servidor. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={colaborador.foto}
            alt=""
            style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--kc-bg)",
              color: "var(--kc-ink-3)",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {iniciales}
          </span>
        )}

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--kc-ink)" }}>
            {colaborador.nombre}
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--kc-ink-4)" }}>
            {colaborador.puesto ?? colaborador.correo}
          </span>
        </span>

        <span style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {colaborador.permisos.esAdmin && <Etiqueta texto="Administra" fuerte />}
          {colaborador.permisos.revisaFaq && !colaborador.permisos.esAdmin && (
            <Etiqueta texto="Revisa FAQ" />
          )}
          <span style={{ fontSize: 10.5, color: "var(--kc-ink-4)", alignSelf: "center" }}>
            {resumenAcceso(colaborador.permisos)}
          </span>
        </span>
      </button>

      {abierto && (
        <div className="kc-fade" style={{ padding: "13px 14px", borderTop: "1px solid var(--kc-line)", background: "var(--kc-bg)" }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <Casilla
              activa={p.esAdmin}
              onClick={() => {
                setP((v) => ({ ...v, esAdmin: !v.esAdmin }));
                setGuardado(false);
              }}
              titulo="Administra"
              detalle="Capacitaciones, rutas y permisos"
            />
            <Casilla
              activa={p.revisaFaq}
              onClick={() => {
                setP((v) => ({ ...v, revisaFaq: !v.revisaFaq }));
                setGuardado(false);
              }}
              titulo="Revisa el FAQ"
              detalle="Acepta propuestas y comentarios"
            />
          </div>

          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", color: "var(--kc-ink-4)", marginBottom: 8 }}>
            SECCIONES QUE VE
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {SECCIONES.map((s) => {
              const marcada = p.secciones.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => alternarSeccion(s.id)}
                  title={s.detalle}
                  className="kc-btn"
                  style={{
                    border: `1px solid ${marcada ? "var(--kc-green-solid)" : "var(--kc-line)"}`,
                    background: marcada ? "var(--kc-cap-soft)" : "#fff",
                    color: marcada ? "var(--kc-cap-ink)" : "var(--kc-ink-3)",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "6px 11px",
                    borderRadius: 8,
                  }}
                >
                  {s.nombre}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 10.5, color: "var(--kc-ink-4)", margin: "0 0 13px", lineHeight: 1.5 }}>
            {/*
              El vacío es «todas» y no «ninguna» a propósito: el Centro existe
              para que el conocimiento circule, así que restringir es la
              excepción y una lista vacía por descuido no debe dejar a nadie
              fuera.
            */}
            {p.secciones.length === 0
              ? "Sin marcar nada, ve todas las secciones. Marca solo si hay que restringir."
              : `Ve ${p.secciones.length} de ${SECCIONES.length} secciones.`}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={guardar}
              disabled={pendiente}
              className="kc-btn"
              style={{
                border: "none",
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "8px 15px",
                borderRadius: 9,
              }}
            >
              {pendiente ? "Guardando…" : "Guardar"}
            </button>

            {guardado && (
              <span style={{ fontSize: 11.5, color: "var(--kc-cap-ink)" }}>Guardado.</span>
            )}
            {error && (
              <span role="alert" style={{ fontSize: 11.5, color: "#C23840" }}>
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Etiqueta({ texto, fuerte }: { texto: string; fuerte?: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: fuerte ? "#fff" : "var(--kc-cap-ink)",
        background: fuerte ? "var(--kc-green-solid)" : "var(--kc-cap-soft)",
        borderRadius: 6,
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {texto}
    </span>
  );
}

function Casilla({
  activa,
  onClick,
  titulo,
  detalle,
}: {
  activa: boolean;
  onClick: () => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kc-btn"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        border: "none",
        background: "transparent",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 15,
          height: 15,
          borderRadius: 4,
          flexShrink: 0,
          marginTop: 1,
          border: activa ? "none" : "1.5px solid var(--kc-line-2)",
          background: activa ? "var(--kc-green-solid)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        {activa && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </span>

      <span>
        <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--kc-ink)" }}>
          {titulo}
        </span>
        <span style={{ display: "block", fontSize: 10.5, color: "var(--kc-ink-4)" }}>{detalle}</span>
      </span>
    </button>
  );
}
