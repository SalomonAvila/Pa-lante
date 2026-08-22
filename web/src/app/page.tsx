import Image from "next/image";
import { VoiceOnboarding } from "@/components/onboarding/VoiceOnboarding";

const STEPS = [
  {
    title: "Cuéntanos tu situación",
    description:
      "Con tus palabras, hablando o escribiendo — sin depender de una plantilla de casillas fijas.",
  },
  {
    title: "Te diagnosticamos con reglas claras",
    description:
      "Nada de caja negra: el diagnóstico se ajusta a tu caso real, no a una plantilla de opciones fijas.",
  },
  {
    title: "Sigues un plan hecho a tu medida",
    description:
      "Recordatorios, alertas de desvío y proyecciones derivadas de tu propio contexto financiero.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-6 pt-6">
        <Image
          src="/hormiga-cargando-moneda.png"
          alt=""
          width={40}
          height={40}
          className="shrink-0"
        />
        <span className="font-heading text-[22px] font-bold tracking-[-0.01em] text-on-surface">
          pa&apos;lante
        </span>
      </header>

      <VoiceOnboarding />

      <main className="mx-auto w-full max-w-5xl px-6 pb-16">
        <section className="flex flex-col gap-8 sm:mx-auto sm:max-w-md">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary label-md text-on-primary">
                  {index + 1}
                </span>
                {index < STEPS.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-outline-variant" />
                )}
              </div>
              <div className="pb-2">
                <h3 className="font-heading text-lg font-semibold text-on-surface">
                  {step.title}
                </h3>
                <p className="mt-1 body-md text-on-surface-variant">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="flex flex-col items-center gap-1 border-t border-outline-variant/50 py-6 text-center label-sm text-on-surface-variant">
        <p>
          Pa&apos;lante es una herramienta de diagnóstico, organización y
          seguimiento — no ofrece asesoría financiera ni de inversión.
        </p>
        <p className="text-on-surface-variant/70">
          Platanus Hack 26 · Track Acceso
        </p>
      </footer>
    </div>
  );
}
