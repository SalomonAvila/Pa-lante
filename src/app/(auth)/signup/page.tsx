import { signIn } from "@/auth";
import { Card } from "@/components/ui/Card";
import { MascotFeedback } from "@/components/shared/MascotFeedback";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface p-6">
      <Card elevated className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <MascotFeedback mood="cargando" size={72} housed />
        <div>
          <h1 className="headline-md text-on-surface">Crea tu cuenta</h1>
          <p className="mt-1 body-md text-on-surface-variant">
            No hay contraseñas que recordar: tu cuenta de Google es tu cuenta
            de Pa&apos;lante, con acceso de solo lectura a tus correos
            bancarios.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/journey" });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full rounded bg-primary px-6 py-3 label-md text-on-primary transition-colors duration-500 hover:bg-primary/90 active:scale-[0.98]"
          >
            Continuar con Google
          </button>
        </form>
      </Card>
    </div>
  );
}
