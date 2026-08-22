import Image from "next/image";

export type MascotMood = "cargando" | "ahorrando" | "alerta" | "pensando";

// TODO: reemplazar cuando existan los assets en public/ (ver naming <accion-hormiga>.png)
const MOOD_TO_IMAGE: Record<MascotMood, string> = {
  cargando: "/hormiga-cargando-moneda.png",
  ahorrando: "/hormiga-ahorrando.png",
  alerta: "/hormiga-alertando.png",
  pensando: "/hormiga-pensando.png",
};

const MOOD_TO_ALT: Record<MascotMood, string> = {
  cargando: "Hormiga cargando una moneda",
  ahorrando: "Hormiga satisfecha ahorrando",
  alerta: "Hormiga alertando un desvío del plan",
  pensando: "Hormiga pensando en un diagnóstico",
};

type MascotFeedbackProps = {
  mood: MascotMood;
  size?: number;
};

export function MascotFeedback({ mood, size = 96 }: MascotFeedbackProps) {
  return (
    <Image
      src={MOOD_TO_IMAGE[mood]}
      alt={MOOD_TO_ALT[mood]}
      width={size}
      height={size}
      className="shrink-0"
    />
  );
}
