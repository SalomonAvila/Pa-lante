"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** "dark" = chip oscuro (sobre el video de fondo), "light" = pill negro (sobre fondo blanco). */
  theme?: "dark" | "light";
};

/**
 * Cerrar sesión. Sin esto no había forma de volver a la pantalla de login:
 * el proxy manda "/login" → "/intake" cuando ya hay sesión, así que quien
 * entraba una vez se quedaba dentro para siempre y parecía que la app no
 * pedía autenticación.
 *
 * Espeja a BackHomeButton en posición y lenguaje visual, pegado a su derecha.
 */
export function CerrarSesionButton({ theme = "dark" }: Props) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  const estilos =
    theme === "light"
      ? "bg-black text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.18)] hover:bg-black/80"
      : "bg-[#28282a] text-[#c8c8c8] shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:bg-[#323234] hover:text-white";

  async function cerrarSesion() {
    setSaliendo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // refresh() para que el proxy vuelva a evaluar la sesión ya vacía y no
    // sirva la versión cacheada de la ruta protegida.
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      disabled={saliendo}
      aria-label="Cerrar sesión"
      className={`fixed left-[68px] top-4 z-20 flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm transition-[background,color,transform] duration-300 hover:-translate-y-0.5 disabled:opacity-60 ${estilos}`}
    >
      <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
      <span>{saliendo ? "Saliendo…" : "Salir"}</span>
    </button>
  );
}
