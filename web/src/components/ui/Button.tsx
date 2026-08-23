import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "dark";
};

/**
 * Mismo lenguaje visual que el CTA de la landing (pill, glow, hover con
 * elevación) — ver LandingExperience.tsx / landing.module.css (.cta,
 * .entrarDesktop). "dark" es la misma forma invertida para usarse sobre
 * fondos claros (ej. la pantalla de grabación).
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "rounded-full px-6 py-3 label-md font-semibold transition-[transform,box-shadow,background,color] duration-300 active:scale-[0.98]";
  const variants = {
    // Réplica de .cta: pill blanco, texto negro, glow blanco.
    primary:
      "bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_0_22px_rgba(255,255,255,0.32),0_0_44px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_28px_rgba(255,255,255,0.48),0_0_54px_rgba(255,255,255,0.2)]",
    // Réplica de .entrarDesktop: chip oscuro, texto tenue que se aclara al hover.
    secondary: "bg-[#28282a] text-[#c8c8c8] shadow-[0_4px_14px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:bg-[#323234] hover:text-white",
    // Misma pill, invertida para fondos claros.
    dark: "bg-black text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_10px_30px_rgba(0,0,0,0.24)]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
