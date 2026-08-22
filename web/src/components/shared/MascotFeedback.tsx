import Image from "next/image";

export type MascotMood =
  | "cargando"
  | "ahorrando" // Focused: sesión de ahorro activa
  | "alerta" // Alert: desvío / sobregasto
  | "pensando"
  | "feliz" // Happy: resumen semanal
  | "satisfecha"; // Satisfied: meta cumplida

// TODO: reemplazar cuando existan los assets en public/ (ver naming <accion-hormiga>.png)
const MOOD_TO_IMAGE: Record<MascotMood, string> = {
  cargando: "/hormiga-cargando-moneda.png",
  ahorrando: "/hormiga-ahorrando.png",
  alerta: "/hormiga-alertando.png",
  pensando: "/hormiga-pensando.png",
  feliz: "/hormiga-feliz.png",
  satisfecha: "/hormiga-satisfecha.png",
};

const MOOD_TO_ALT: Record<MascotMood, string> = {
  cargando: "Hormiga cargando una moneda",
  ahorrando: "Hormiga enfocada en una sesión de ahorro",
  alerta: "Hormiga alertando un desvío del plan",
  pensando: "Hormiga pensando en un diagnóstico",
  feliz: "Hormiga feliz celebrando el resumen semanal",
  satisfecha: "Hormiga satisfecha por cumplir una meta",
};

// Housing: marco con tinte tonal a color del estado emocional, sin sombra.
const MOOD_TO_HOUSING: Record<MascotMood, string> = {
  cargando: "bg-primary-container/15",
  ahorrando: "bg-tertiary-container/15",
  alerta: "bg-error-container",
  pensando: "bg-secondary-container",
  feliz: "bg-mascot-happy/15",
  satisfecha: "bg-mascot-satisfied/15",
};

type MascotFeedbackProps = {
  mood: MascotMood;
  size?: number;
  housed?: boolean;
};

export function MascotFeedback({
  mood,
  size = 96,
  housed = false,
}: MascotFeedbackProps) {
  const image = (
    <Image
      src={MOOD_TO_IMAGE[mood]}
      alt={MOOD_TO_ALT[mood]}
      width={size}
      height={size}
      className="shrink-0"
    />
  );

  if (!housed) return image;

  return (
    <div
      className={`flex items-center justify-center rounded-xl p-4 ${MOOD_TO_HOUSING[mood]}`}
    >
      {image}
    </div>
  );
}
