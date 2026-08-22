import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface p-6">
      <Card elevated className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground">
          Inicia sesión
        </h1>
        <form className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo"
            className="rounded-medium border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="rounded-medium border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm"
          />
          <Button type="submit">Entrar</Button>
        </form>
        <p className="mt-4 text-center text-sm text-outline">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="font-semibold text-primary">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
