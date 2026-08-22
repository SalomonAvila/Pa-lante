import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MascotFeedback } from "@/components/shared/MascotFeedback";

export default function IntakePage() {
  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-surface p-6 py-16">
      <MascotFeedback mood="cargando" size={120} />
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
          Conecta tu contexto financiero
        </h1>
        <p className="mt-2 max-w-md text-sm leading-[1.6] text-outline">
          Gmail es la vía más rápida, pero cargar tus extractos en PDF
          funciona igual de bien.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
        <Card elevated className="flex-1">
          <h2 className="font-semibold text-foreground">Gmail</h2>
          <p className="mt-1 text-sm text-outline">
            Acceso restringido de solo lectura a notificaciones bancarias.
          </p>
          <Button className="mt-4 w-full">Conectar Gmail</Button>
        </Card>
        <Card elevated className="flex-1">
          <h2 className="font-semibold text-foreground">PDF</h2>
          <p className="mt-1 text-sm text-outline">
            Sube tus extractos bancarios (con clave si aplica).
          </p>
          <Button variant="secondary" className="mt-4 w-full">
            Cargar PDF
          </Button>
        </Card>
      </div>
    </div>
  );
}
