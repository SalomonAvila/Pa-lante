import { Card } from "@/components/ui/Card";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface p-6">
      <Card
        elevated
        className="flex w-full max-w-sm flex-col items-center gap-6 text-center"
      >
        <MascotFeedback mood="cargando" size={72} housed />
        <div>
          <h1 className="headline-md text-on-surface">Entra a Pa&apos;lante</h1>
          <p className="mt-1 body-md text-on-surface-variant">
            Sin contraseñas. Entra con Google o con un enlace a tu correo.
          </p>
        </div>
        <LoginForm />
      </Card>
    </div>
  );
}
