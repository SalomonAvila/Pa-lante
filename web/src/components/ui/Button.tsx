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
    "rounded-full px-6 py-3 label-md transition-colors duration-500 active:scale-[0.98] transition-transform";
  const variants = {
    primary: "bg-primary text-on-primary hover:bg-primary/90",
    secondary:
      "border-2 border-on-surface bg-transparent text-on-surface hover:bg-on-surface/5",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
