import { ConectarGmailButton } from "@/components/auth/ConectarGmailButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MascotFeedback } from "@/components/shared/MascotFeedback";

export default function IntakeClasicoPage() {
  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-surface p-6 py-16">
      <MascotFeedback mood="cargando" size={120} housed />
      <div className="text-center">
        <h1 className="headline-md text-on-surface">
          Conecta tu contexto financiero
        </h1>
        <p className="mt-2 max-w-md body-md text-on-surface-variant">
          Gmail es la vía más rápida, pero cargar tus extractos en PDF
          funciona igual de bien.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
        <Card elevated className="flex-1">
          <h2 className="font-semibold text-on-surface">Gmail</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Acceso restringido de solo lectura a notificaciones bancarias.
          </p>
          <ConectarGmailButton />
        </Card>
        <Card elevated className="flex-1">
          <h2 className="font-semibold text-on-surface">PDF</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
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
