const STEPS = 7;

/**
 * El "vúmetro" de la conversación: en vez de barras genéricas, un rastro de
 * huellas que camina — coherente con la marca (pa'lante = seguir adelante) y
 * con el sendero en zigzag que ya usa /journey.
 */
export function FootstepTrail({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-end gap-2"
      role="img"
      aria-label={active ? "Pa'lante está escuchando" : "En pausa"}
    >
      {Array.from({ length: STEPS }).map((_, i) => (
        <span
          key={i}
          className="onboarding-footstep h-2 w-2 rounded-full bg-primary"
          style={{
            animation: active
              ? `footstep 1.1s ease-in-out ${i * 0.11}s infinite`
              : "none",
            opacity: active ? undefined : 0.25,
          }}
        />
      ))}
    </div>
  );
}
