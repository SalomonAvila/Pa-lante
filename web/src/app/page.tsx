import Image from "next/image";
import Link from "next/link";
import { EspiralContexto } from "@/components/landing/EspiralContexto";

// EspiralContexto es "use client": en el servidor solo se renderiza su div
// vacío y todo el WebGL arranca en useEffect, ya en el navegador.

export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#141f3d]">
      {/* La espiral ocupa toda la pantalla y sangra por la derecha: la
          composición es asimétrica a propósito, el texto respira a la
          izquierda y el movimiento sucede al lado, no debajo. */}
      <div className="absolute inset-0 md:left-[26%]">
        <EspiralContexto />
      </div>

      {/* Velo hacia la izquierda para que el texto siempre tenga contraste,
          sin importar dónde caigan las partículas. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#141f3d] via-[#141f3d]/85 to-transparent md:to-40%"
      />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <Image
            src="/hormiga-cargando-moneda.png"
            alt=""
            width={34}
            height={34}
            priority
          />
          <span className="font-heading text-[20px] font-bold tracking-[-0.02em] text-white">
            pa&apos;lante
          </span>
        </div>
      </header>

      <main className="relative z-10 flex h-full items-center px-6 sm:px-10">
        <div className="w-full max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 label-sm text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Finanzas Abiertas · Colombia
          </span>

          <h1 className="mt-7 font-heading text-[clamp(3rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.035em] text-white">
            Del caos
            <br />
            al <span className="text-primary">plan</span>.
          </h1>

          <p className="mt-6 max-w-md body-lg text-white/65">
            Tus correos del banco y tus extractos se vuelven un plan que avanza
            solo. Y los datos siguen siendo tuyos.
          </p>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login"
              className="rounded-full bg-primary px-8 py-4 label-md text-on-primary transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98]"
            >
              Entrar
            </Link>
            <span className="label-sm text-white/40">
              Solo lectura. Sin claves de tu banco.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
