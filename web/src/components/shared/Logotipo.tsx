type LogotipoProps = {
  /** Lado en píxeles. El símbolo está pensado para leerse desde 12px. */
  size?: number;
  className?: string;
};

/**
 * Marca de Pa'lante: tres galones que crecen hacia la derecha.
 *
 * Son los tres segmentos del cuerpo de una hormiga —cabeza, tórax, abdomen—
 * y a la vez avance y el `»` de una terminal. Guarda el ADN de la mascota
 * anterior sin dibujarla, que era lo que se rompía a tamaños pequeños.
 *
 * Usa `currentColor`: hereda el color del contenedor, así sirve igual sobre
 * negro que dentro de la píldora blanca de la barra.
 */
export function Logotipo({ size = 24, className }: LogotipoProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Pa'lante"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.4 5.2 L5.3 8 L2.4 10.8" strokeWidth="1.7" />
      <path d="M6.4 4.4 L10.1 8 L6.4 11.6" strokeWidth="2" />
      {/* El galón mayor cierra en punta (miter) para dar la lectura de cabeza. */}
      <path
        d="M11.2 3.4 L13.6 8 L11.2 12.6"
        strokeWidth="2.3"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
