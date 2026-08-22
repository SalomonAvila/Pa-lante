import { Card } from "@/components/ui/Card";
import { RouteCard } from "@/components/shared/RouteCard";
import { MascotFeedback } from "@/components/shared/MascotFeedback";

export default function InsightsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-center gap-4">
        <MascotFeedback mood="pensando" size={72} />
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
            Diagnóstico
          </h1>
          <p className="text-sm leading-[1.6] text-outline">
            Esto es lo que vemos en tu flujo neto y tus categorías de gasto.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card elevated>
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-outline">
            Flujo neto mensual
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[-0.02em] text-positive">
            +$420.000
          </p>
        </Card>
        <Card elevated>
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-outline">
            Deuda de alto costo
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[-0.02em] text-debt">
            $1.850.000
          </p>
        </Card>
      </div>

      <RouteCard
        emoji="🪃"
        title="Ruta sugerida: Salida de deudas"
        description="Tu deuda de alto costo supera el 30% de tu ingreso mensual. Priorizamos pagar primero la de mayor tasa."
      />
    </div>
  );
}
