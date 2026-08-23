import Link from "next/link";

type Props = {
  /** "dark" = chip oscuro (sobre el video de fondo), "light" = pill negro (sobre fondo blanco). */
  theme?: "dark" | "light";
};

/**
 * Volver a "/", con el mismo lenguaje de pill que el resto de la landing
 * (ver .entrarDesktop en landing.module.css: chip redondo, sombra, texto
 * que se aclara al hover).
 */
export function BackHomeButton({ theme = "dark" }: Props) {
  const estilos =
    theme === "light"
      ? "bg-black text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.18)] hover:bg-black/80"
      : "bg-[#28282a] text-[#c8c8c8] shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:bg-[#323234] hover:text-white";

  return (
    <Link
      href="/"
      aria-label="Volver al inicio"
      className={`fixed left-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full transition-[background,color,transform] duration-300 hover:-translate-y-0.5 ${estilos}`}
    >
      <i className="fa-solid fa-arrow-left" aria-hidden="true" />
    </Link>
  );
}
