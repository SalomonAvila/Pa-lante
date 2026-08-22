import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "rounded-medium px-6 py-3 text-sm font-semibold tracking-[-0.01em] transition-colors";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary:
      "border border-outline-variant text-primary hover:bg-primary-container",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
