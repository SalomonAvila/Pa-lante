import { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ elevated = false, className = "", ...props }: CardProps) {
  const surface = elevated
    ? "bg-surface-container-lowest"
    : "bg-surface-container-low";

  return (
    <div
      className={`rounded border border-outline-variant/50 p-6 ${surface} ${className}`}
      {...props}
    />
  );
}
