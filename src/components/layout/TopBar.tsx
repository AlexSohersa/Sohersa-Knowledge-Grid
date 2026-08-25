"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "./icons";

/**
 * La barra superior: la búsqueda es permanente y protagonista.
 *
 * Se queda arriba en todas las pantallas porque buscar es la acción principal
 * del Centro: casi nadie navega el árbol, la gente escribe lo que necesita.
 *
 * La búsqueda navega a `/buscar?q=…` en vez de filtrar en memoria: así el
 * resultado se puede compartir por enlace y el botón de atrás del navegador
 * funciona como se espera.
 */
export function TopBar({
  guardados,
  avisos,
}: {
  guardados: number;
  /* La campana llega ya construida desde el layout: este componente corre en
     el cliente y no puede consultar los avisos por su cuenta. */
  avisos?: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(params.get("q") ?? "");

  // Cuando la navegación cambia la consulta —por ejemplo al pulsar atrás—, el
  // campo tiene que reflejarla; si no, muestra lo último que se tecleó y miente
  // sobre lo que hay en pantalla.
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  // ⌘K / Ctrl+K enfoca la búsqueda desde cualquier sitio, como anuncia la
  // pista del propio campo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = q.trim();
    // Buscar vacío no lleva a una pantalla de resultados vacía: no aporta nada
    // y hace perder el sitio donde se estaba.
    if (!limpio) return;
    router.push(`/buscar?q=${encodeURIComponent(limpio)}`);
  }

  return (
    <header
      style={{
        height: "var(--kc-topbar)",
        flexShrink: 0,
        background: "#fff",
        borderBottom: "1px solid var(--kc-line)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 22px",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <form
        onSubmit={buscar}
        role="search"
        style={{ flex: 1, maxWidth: 520, display: "flex" }}
      >
        <label
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--kc-bg)",
            border: "1px solid #E4EAF1",
            borderRadius: 11,
            padding: "0 13px",
            height: 38,
            cursor: "text",
          }}
        >
          <span style={{ color: "var(--kc-ink-3)", display: "flex" }}>
            <Icon name="search" size={15} />
          </span>
          <span className="kc-sr">Buscar en Sohersa Knowledge Grid</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca un instructivo, capacitación, software, pregunta o tema…"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--kc-font)",
              fontSize: 12.5,
              color: "var(--kc-ink)",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--kc-ink-4)",
              background: "#fff",
              border: "1px solid #E4EAF1",
              borderRadius: 5,
              padding: "2px 6px",
              flexShrink: 0,
            }}
          >
            ⌘K
          </span>
        </label>
      </form>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
        {avisos}

        <Link
          href="/guardados"
          title="Guardados"
          className="kc-btn"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid var(--kc-line)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--kc-ink-2)",
            position: "relative",
          }}
        >
          <Icon name="star" size={15} />
          <span className="kc-sr">Guardados</span>
          {guardados > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                borderRadius: 20,
                background: "var(--kc-green-solid)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
              }}
            >
              {guardados}
            </span>
          )}
        </Link>

        <Link
          href="/historial"
          title="Historial"
          className="kc-btn"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid var(--kc-line)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--kc-ink-2)",
          }}
        >
          <Icon name="hist" size={15} />
          <span className="kc-sr">Historial</span>
        </Link>

        <Link
          href="/comunidad/preguntar"
          className="kc-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            border: "none",
            background: "var(--kc-green-solid)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            padding: "9px 14px",
            borderRadius: 10,
            whiteSpace: "nowrap",
            boxShadow: "var(--kc-shadow-btn)",
          }}
        >
          <Icon name="plus" size={13} />
          Preguntar
        </Link>
      </div>
    </header>
  );
}
