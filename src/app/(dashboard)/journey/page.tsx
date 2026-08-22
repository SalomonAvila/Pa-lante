import { ProgressPath } from "@/components/dashboard/ProgressPath";
import { MascotFeedback } from "@/components/shared/MascotFeedback";

export default function JourneyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <MascotFeedback mood="ahorrando" size={96} />
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
          Tu camino
        </h1>
        <p className="max-w-md text-sm leading-[1.6] text-outline">
          Cada paso de tu plan te acerca a tu meta. Los nodos se van
          completando a medida que avanzas.
        </p>
      </div>
      <ProgressPath
        steps={[
          { label: "Diagnóstico", status: "done" },
          { label: "Primer aporte", status: "done" },
          { label: "Mes 2", status: "current" },
          { label: "Mes 3", status: "upcoming" },
          { label: "Meta", status: "upcoming" },
        ]}
      />
    </div>
  );
}
