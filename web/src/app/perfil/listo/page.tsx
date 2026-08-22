import Link from "next/link";
import { MascotFeedback } from "@/components/shared/MascotFeedback";

export default function PerfilListoPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 p-6 py-20 text-center">
      <MascotFeedback mood="satisfecha" size={120} housed />
      <h1 className="headline-md text-on-surface">Tu perfil financiero está listo</h1>
      <p className="body-md text-on-surface-variant">
        Ya centralizamos lo que encontramos. Puedes seguir completándolo cuando quieras desde
        Configuración → Privacidad.
      </p>
      <Link
        href="/panorama"
        className="rounded bg-primary px-6 py-3 label-md text-on-primary transition-colors duration-500 hover:bg-primary/90"
      >
        Ver mi panorama financiero
      </Link>
    </div>
  );
}
