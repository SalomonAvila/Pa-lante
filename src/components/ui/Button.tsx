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
    "rounded px-6 py-3 label-md transition-colors duration-500 active:scale-[0.98] transition-transform";
  const variants = {
    primary: "bg-primary text-on-primary hover:bg-primary/90",
    secondary:
      "border-2 border-primary bg-transparent text-primary hover:bg-primary-container/10",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
