import Link from "next/link";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { RouteCard } from "@/components/shared/RouteCard";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16 sm:py-24">
        {/* Hero */}
        <section className="flex flex-col items-center gap-8 text-center sm:flex-row sm:text-left">
          <MascotFeedback mood="cargando" size={280} />
          <div className="flex flex-col gap-4">
            <span className="mx-auto w-fit rounded-full bg-primary-container px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-primary sm:mx-0">
              Platanus Hack 26 · Track Acceso
            </span>
            <h1 className="text-4xl font-bold tracking-[-0.02em] text-foreground sm:text-5xl">
              Pa&apos;lante
            </h1>
            <p className="max-w-xl text-lg leading-[1.6] text-outline">
              Tu contexto financiero está atrapado en correos bancarios y PDFs
              de extractos. Pa&apos;lante lo organiza y te arma un plan paso a
              paso, automatizado, para salir de deudas, ganar visibilidad o
              empezar a ahorrar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/intake"
                className="rounded-medium bg-primary px-6 py-3 text-center text-sm font-semibold tracking-[-0.01em] text-primary-foreground transition-colors hover:opacity-90"
              >
                Conectar Gmail
              </Link>
              <Link
                href="/intake"
                className="rounded-medium border border-outline-variant px-6 py-3 text-center text-sm font-semibold tracking-[-0.01em] text-primary transition-colors hover:bg-primary-container"
              >
                Cargar extracto en PDF
              </Link>
            </div>
          </div>
        </section>

        {/* Rutas de diagnóstico */}
        <section className="mt-20 flex flex-col gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
              Un diagnóstico, tres rutas
            </h2>
            <p className="mt-2 text-outline">
              Con reglas explícitas, no una caja negra: te ubicamos en la ruta
              que corresponde a tu situación.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <RouteCard
              emoji="🪃"
              title="Salida de deudas"
              description="Deuda de alto costo por encima del 30% de tu ingreso mensual: priorizamos pagar primero la de mayor tasa."
            />
            <RouteCard
              emoji="🔍"
              title="Visibilidad"
              description="Flujo neto negativo o gasto sin categorizar: primero entendemos a dónde se va tu plata antes de planear."
            />
            <RouteCard
              emoji="🌱"
              title="Meta de ahorro"
              description="Flujo neto positivo y sin deuda cara: definimos una meta de ahorro o capacidad de inversión."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant py-6 text-center text-xs text-outline">
        Pa&apos;lante es una herramienta de diagnóstico, organización y
        seguimiento — no ofrece asesoría financiera ni de inversión.
      </footer>
    </div>
  );
}
