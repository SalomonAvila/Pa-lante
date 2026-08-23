"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** "dark" = sobre el video de fondo; "light" = sobre fondo blanco. */
  theme?: "dark" | "light";
  /** Fija el avatar arriba a la derecha. En la landing va dentro del header. */
  flotante?: boolean;
};

type Identidad = {
  nombre: string | null;
  correo: string | null;
  fotoUrl: string | null;
  iniciales: string;
  colores: readonly [string, string];
};

/**
 * Dos letras legibles a 44px: nombre + primer apellido cuando hay nombre, si
 * no las dos primeras del correo ("adrian.ruiz@…" → "AR"). Se saltan las
 * partículas ("de", "del", "la") para que "Ana de la Torre" dé "AT", no "AD".
 */
function calcularIniciales(nombre: string | null, correo: string | null): string {
  const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "da", "van", "von"]);

  if (nombre) {
    const palabras = nombre
      .trim()
      .split(/\s+/)
      .filter((p) => !PARTICULAS.has(p.toLowerCase()));
    // Nombre + primer apellido, no el último: en español hay dos apellidos y
    // "Salomón Ávila Sánchez" se reconoce como "SÁ", no como "SS".
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase();
    }
    if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  }

  const local = correo?.split("@")[0] ?? "";
  // "adrian.ruiz" / "adrian_ruiz" / "adrian-ruiz" → "AR"
  const partes = local.split(/[._-]+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  if (local) return local.slice(0, 2).toUpperCase();
  return "··";
}

/**
 * Paleta curada en vez de un tono HSL calculado: generar el color desde un
 * hash libre deja salir amarillos y verdes claros donde el texto blanco
 * pierde contraste. Estos ocho están elegidos oscuros para que el blanco
 * siempre se lea, y bastante separados entre sí para distinguir cuentas.
 */
const COLORES = [
  ["#b23a48", "#7d2733"], // rojo
  ["#6d4aa8", "#4a3175"], // morado
  ["#2f6f8f", "#1f4d64"], // azul petróleo
  ["#1f7a5a", "#14543e"], // verde
  ["#a0562c", "#733c1e"], // tierra
  ["#8a3a7a", "#5f2854"], // magenta
  ["#3a5ea8", "#274176"], // índigo
  ["#5c6b2f", "#3f4a20"], // oliva
] as const;

/** Color estable por usuario: el mismo correo da siempre el mismo par. */
function calcularColor(semilla: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < semilla.length; i += 1) {
    hash = (hash * 31 + semilla.charCodeAt(i)) % 1000003;
  }
  return COLORES[hash % COLORES.length];
}

function leerIdentidad(user: User): Identidad {
  const meta = user.user_metadata ?? {};
  const nombre =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  const correo = user.email ?? null;
  const fotoUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  return {
    nombre,
    correo,
    fotoUrl,
    iniciales: calcularIniciales(nombre, correo),
    colores: calcularColor(correo ?? user.id),
  };
}

/**
 * Quién está dentro, y la puerta de salida. Reemplaza al botón suelto de
 * "Salir": con Google se ve la foto de la cuenta; con enlace mágico no hay
 * foto que traer, así que se dibujan las iniciales sobre un color derivado
 * del propio correo (estable, distinto por persona).
 *
 * Si la foto no carga —URL vencida, sin red— cae a las iniciales en vez de
 * dejar un hueco roto.
 */
export function AvatarUsuario({ theme = "dark", flotante = false }: Props) {
  const router = useRouter();
  const [identidad, setIdentidad] = useState<Identidad | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [fotoFallo, setFotoFallo] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIdentidad(data.user ? leerIdentidad(data.user) : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setIdentidad(sesion?.user ? leerIdentidad(sesion.user) : null);
      setFotoFallo(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!abierto) return;

    function alClicFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    }
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [abierto]);

  const cerrarSesion = useCallback(async () => {
    setSaliendo(true);
    await createClient().auth.signOut();
    setAbierto(false);
    router.replace("/login");
    router.refresh();
  }, [router]);

  // Sin sesión no hay nada que mostrar: quien decide qué va en su lugar
  // (un "Entrar", o nada) es el contenedor.
  if (!identidad) return null;

  const { nombre, correo, fotoUrl, iniciales, colores } = identidad;
  const mostrarFoto = Boolean(fotoUrl) && !fotoFallo;
  const etiqueta = nombre ?? correo ?? "tu cuenta";

  const anillo =
    theme === "light"
      ? "ring-1 ring-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      : "ring-1 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.16)]";

  const panel =
    theme === "light"
      ? "bg-white text-black ring-1 ring-black/10 shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
      : "bg-[#1c1c1e] text-white ring-1 ring-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.45)]";

  return (
    <div
      ref={contenedor}
      className={`${flotante ? "fixed right-4 top-4 z-20" : "relative"} flex-none`}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Cuenta de ${etiqueta}`}
        title={etiqueta}
        className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full transition-transform duration-300 hover:-translate-y-0.5 ${anillo}`}
        style={
          mostrarFoto
            ? undefined
            : {
                backgroundImage: `linear-gradient(140deg, ${colores[0]}, ${colores[1]})`,
              }
        }
      >
        {mostrarFoto ? (
          <Image
            src={fotoUrl!}
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setFotoFallo(true)}
            unoptimized
          />
        ) : (
          <span className="text-sm font-semibold tracking-wide text-white">
            {iniciales}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="menu"
          className={`absolute right-0 top-[52px] min-w-[220px] overflow-hidden rounded-2xl ${panel}`}
        >
          <div className="border-b border-current/10 px-4 py-3">
            {nombre && <p className="truncate text-sm font-medium">{nombre}</p>}
            {correo && (
              <p className="truncate text-xs opacity-60">{correo}</p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={cerrarSesion}
            disabled={saliendo}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors hover:bg-current/10 disabled:opacity-60"
          >
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            {saliendo ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
