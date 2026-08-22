/**
 * Ambiente del hero: tres capas de luz que derivan lentamente sobre el crema.
 *
 * No es un video a propósito — no hay archivo que cargar, nada que se caiga
 * con mal wifi en una demo, y al ser luz sobre fondo claro el texto encima
 * conserva el contraste que exige PRODUCT.md (usuarios mayores, baja
 * alfabetización digital).
 */
export function AmbienteHero() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Dorado: la luz principal, arriba a la derecha. */}
      <div
        className="aurora-a absolute -right-[10%] -top-[30%] h-[70vh] w-[70vw] rounded-full opacity-[0.55] blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, var(--color-primary) 0%, transparent 68%)",
        }}
      />
      {/* Verde: contrapeso frío abajo a la izquierda. */}
      <div
        className="aurora-b absolute -left-[24%] top-[42%] h-[58vh] w-[58vw] rounded-full opacity-[0.22] blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, var(--color-tertiary) 0%, transparent 70%)",
        }}
      />
      {/* Navy: profundidad al pie, para que la sección no flote. */}
      <div
        className="aurora-c absolute bottom-[-32%] left-[24%] h-[58vh] w-[58vw] rounded-full opacity-[0.16] blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, var(--color-secondary) 0%, transparent 72%)",
        }}
      />
      {/* Grano: rompe el degradado plano, que es lo que delata un fondo
          generado. Muy sutil, casi imperceptible de cerca. */}
      <div
        className="absolute inset-0 opacity-[0.28] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.28'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Desvanecido al crema en el borde inferior, para entregar la
          transición a la siguiente sección sin un corte duro. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface" />
    </div>
  );
}
