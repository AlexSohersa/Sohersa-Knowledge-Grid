"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./icons";
import { Avatar } from "@/components/hub/Avatar";
import { signOut } from "next-auth/react";

/**
 * La barra superior, con el aspecto del Digital Core.
 *
 * Mismo alto y mismo azul que las demás herramientas, para que pasar de una a
 * otra no se sienta como cambiar de producto. A la derecha van la ficha de
 * quien entró y la salida, en el mismo sitio en todas.
 *
 * La búsqueda se queda —es la acción principal del Centro: casi nadie navega
 * el árbol, la gente escribe lo que necesita— pero más discreta, a la
 * izquierda junto a los avisos, en vez de ocupar media barra.
 *
 * Navega a `/buscar?q=…` en vez de filtrar en memoria: así el resultado se
 * puede compartir por enlace y el botón de atrás funciona como se espera.
 */
export function TopBar({
  avisos,
  name,
  email,
  image,
}: {
  /* La campana llega ya construida desde el layout: este componente corre en
     el cliente y no puede consultar los avisos por su cuenta. */
  avisos?: React.ReactNode;
  name?: string | null;
  email?: string | null;
  image?: string | null;
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
        height: 58,
        flexShrink: 0,
        background: "var(--cv-deep)",
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
        style={{ flex: "0 1 320px", minWidth: 150, display: "flex" }}
      >
        <label
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.13)",
            borderRadius: 11,
            padding: "0 12px",
            height: 34,
            cursor: "text",
          }}
        >
          <span style={{ color: "var(--cv-dk-3)", display: "flex" }}>
            <Icon name="search" size={14} />
          </span>
          <span className="kc-sr">Buscar en Sohersa Knowledge Grid</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--kc-font)",
              fontSize: 12.5,
              color: "#fff",
            }}
          />
        </label>
      </form>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
        {avisos}

        {/* Quién entró y por dónde se sale, en el mismo sitio que en las demás
            herramientas. Guardados e Historial se fueron de aquí: siguen en el
            riel, que es donde se navega, y en la barra competían con lo único
            que hace falta tener siempre a la vista. */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 12px 4px 5px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.13)",
            background: "rgba(255,255,255,.06)",
          }}
        >
          <Avatar name={name} email={email} image={image} size={28} online={false} />
          <span className="hidden lg:block" style={{ lineHeight: 1.2 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#fff" }}>
              {name ?? "Sin nombre"}
            </span>
            <span style={{ display: "block", fontSize: 10, color: "var(--cv-dk-3)" }}>
              {email}
            </span>
          </span>
        </span>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            signOut({ callbackUrl: "/login" });
          }}
        >
          <button
            type="submit"
            title="Salir"
            aria-label="Cerrar sesión"
            className="kc-btn"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              border: "1px solid rgba(255,255,255,.13)",
              background: "rgba(255,255,255,.06)",
              color: "var(--cv-dk-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="logout" size={15} />
          </button>
        </form>
      </div>
    </header>
  );
}
