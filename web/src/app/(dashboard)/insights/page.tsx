import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RouteCard } from "@/components/shared/RouteCard";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { DebtIcon } from "@/components/shared/icons";

export default function InsightsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-center gap-4">
        <MascotFeedback mood="pensando" size={72} housed />
        <div>
          <h1 className="headline-md text-on-surface">Diagnóstico</h1>
          <p className="body-md text-on-surface-variant">
            Esto es lo que vemos en tu flujo neto y tus categorías de gasto.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card elevated>
          <p className="label-sm uppercase text-on-surface-variant">
            Flujo neto mensual
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[-0.02em] text-positive">
            +$420.000
          </p>
        </Card>
        <Card elevated>
          <p className="label-sm uppercase text-on-surface-variant">
            Deuda de alto costo
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[-0.02em] text-debt">
            $1.850.000
          </p>
        </Card>
      </div>

      <Card elevated className="flex flex-col gap-3">
        <p className="label-sm uppercase text-on-surface-variant">
          Meta de ahorro del mes
        </p>
        <ProgressBar value={0.65} />
        <p className="body-md text-on-surface-variant">
          Llevas $260.000 de $400.000 planeados este mes.
        </p>
      </Card>

      <RouteCard
        icon={DebtIcon}
        accentClassName="text-debt"
        chipClassName="bg-primary-container"
        tag="Ruta sugerida"
        title="Salida de deudas"
        description="Tu deuda de alto costo supera el 30% de tu ingreso mensual. Priorizamos pagar primero la de mayor tasa."
      />
    </div>
  );
}
