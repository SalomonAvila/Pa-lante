import Image from "next/image";
import Link from "next/link";
import { AmbienteHero } from "@/components/landing/AmbienteHero";

const PASOS = [
  {
    numero: "01",
    titulo: "Conectas lo que ya tienes",
    texto:
      "Tu correo del banco, tus PDFs de extractos. No hay que llenar formularios ni acordarse de nada: tu historia financiera ya está escrita, solo hay que leerla.",
  },
  {
    numero: "02",
    titulo: "Te decimos dónde estás parado",
    texto:
      "Con reglas que puedes leer, no con una caja negra. Si tu deuda cara pasa del 30% de tu ingreso, te lo decimos y te mostramos la cuenta.",
  },
  {
    numero: "03",
    titulo: "El plan avanza contigo",
    texto:
      "Pasos concretos con fecha y monto. Cuando el banco confirma el pago, el paso se marca solo. No tienes que volver a la app a reportar nada.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      {/* ---------------------------------------------------------------- */}
      {/* Barra                                                             */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-outline-variant/40 bg-surface/70 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/hormiga-cargando-moneda.png"
              alt=""
              width={36}
              height={36}
              className="shrink-0"
              priority
            />
            <span className="font-heading text-[21px] font-bold tracking-[-0.02em] text-on-surface">
              pa&apos;lante
            </span>
          </Link>

          <Link
            href="/login"
            className="rounded-full bg-secondary px-5 py-2.5 label-md text-on-secondary transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            Entrar
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* -------------------------------------------------------------- */}
        {/* Hero                                                            */}
        {/* -------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden px-6 pb-28 pt-20 sm:pt-28">
          <AmbienteHero />

          <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
            <span
              className="emerger inline-flex items-center gap-2 rounded-full border border-outline-variant/70 bg-surface-container-lowest/80 px-4 py-1.5 label-sm text-on-surface-variant backdrop-blur"
              style={{ "--retraso": "0ms" } as React.CSSProperties}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              Construido para las Finanzas Abiertas de Colombia
            </span>

            <h1
              className="emerger mt-8 font-heading text-[clamp(2.6rem,7vw,4.6rem)] font-bold leading-[1.02] tracking-[-0.03em] text-on-surface"
              style={{ "--retraso": "90ms" } as React.CSSProperties}
            >
              Tus sueños no necesitan
              <br />
              más plata.{" "}
              {/* Resaltado como fondo del propio texto: sigue la caja de la
                  palabra en cualquier tamaño y no se descuadra al reflujo,
                  cosa que sí pasaba con una capa posicionada aparte. */}
              <span
                className="bg-no-repeat"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--color-primary-fixed-dim), var(--color-primary-fixed-dim))",
                  backgroundSize: "100% 0.3em",
                  backgroundPosition: "0 76%",
                }}
              >
                Necesitan
              </span>{" "}
              contexto.
            </h1>

            <p
              className="emerger mt-7 max-w-xl body-lg text-on-surface-variant"
              style={{ "--retraso": "180ms" } as React.CSSProperties}
            >
              Tu vida financiera ya está escrita en doscientos correos del banco
              y en extractos con clave. Pa&apos;lante la reúne, te la devuelve
              ordenada y la convierte en un plan que avanza solo.
            </p>

            <div
              className="emerger mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
              style={{ "--retraso": "270ms" } as React.CSSProperties}
            >
              <Link
                href="/login"
                className="w-full rounded-full bg-secondary px-8 py-4 text-center label-md text-on-secondary transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] sm:w-auto"
              >
                Empieza ahora
              </Link>
              <Link
                href="#como-funciona"
                className="w-full rounded-full border border-outline bg-surface-container-lowest/70 px-8 py-4 text-center label-md text-on-surface backdrop-blur transition-colors duration-300 hover:bg-surface-container-lowest sm:w-auto"
              >
                Ver cómo funciona
              </Link>
            </div>

            <p
              className="emerger mt-5 label-sm text-on-surface-variant"
              style={{ "--retraso": "340ms" } as React.CSSProperties}
            >
              Sin tarjeta. Sin contraseñas de tu banco. Solo lectura.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* La asimetría — el problema, dicho sin rodeos                     */}
        {/* -------------------------------------------------------------- */}
        <section className="border-y border-outline-variant/50 bg-surface-container-lowest px-6 py-24">
          <div className="mx-auto grid w-full max-w-5xl gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <p className="label-sm uppercase tracking-[0.14em] text-on-surface-variant">
                El problema
              </p>
              <h2 className="mt-4 font-heading text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.12] tracking-[-0.02em] text-on-surface">
                Tu banco sabe todo de ti.
                <br />
                Tú no.
              </h2>
              <p className="mt-5 body-md text-on-surface-variant">
                Ellos ven tus patrones, tus ingresos y tus riesgos en un tablero.
                Tú ves un saldo y una lista de movimientos con nombres como{" "}
                <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[13px] text-on-surface">
                  COMPRA PSE *DLO*RAPPI BOG
                </span>
                . Esa diferencia tiene nombre: asimetría de información, y es la
                razón por la que planear se siente imposible.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-4">
              {[
                { valor: "200+", texto: "correos del banco sin leer al año" },
                { valor: "12", texto: "PDFs de extracto protegidos con clave" },
                { valor: "0", texto: "lugares donde todo eso se ve junto" },
              ].map((dato) => (
                <div
                  key={dato.texto}
                  className="flex items-baseline gap-5 rounded-xl border border-outline-variant/60 bg-surface px-6 py-5"
                >
                  <span className="font-heading text-3xl font-bold tabular-nums text-primary">
                    {dato.valor}
                  </span>
                  <span className="body-md text-on-surface-variant">
                    {dato.texto}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Cómo funciona                                                   */}
        {/* -------------------------------------------------------------- */}
        <section id="como-funciona" className="scroll-mt-20 px-6 py-24">
          <div className="mx-auto w-full max-w-5xl">
            <div className="max-w-2xl">
              <p className="label-sm uppercase tracking-[0.14em] text-on-surface-variant">
                Cómo funciona
              </p>
              <h2 className="mt-4 font-heading text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.12] tracking-[-0.02em] text-on-surface">
                Tres pasos, y el tercero
                <br className="hidden sm:block" /> se ocupa de sí mismo.
              </h2>
            </div>

            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {PASOS.map((paso) => (
                <li
                  key={paso.numero}
                  className="group relative flex flex-col rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-7 transition-colors duration-500 hover:border-primary/60"
                >
                  <span className="font-heading text-sm font-bold tabular-nums tracking-[0.1em] text-primary">
                    {paso.numero}
                  </span>
                  <h3 className="mt-4 font-heading text-xl font-bold leading-snug tracking-[-0.01em] text-on-surface">
                    {paso.titulo}
                  </h3>
                  <p className="mt-3 body-md text-on-surface-variant">
                    {paso.texto}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Propiedad de los datos — el diferenciador                        */}
        {/* -------------------------------------------------------------- */}
        <section className="border-t border-outline-variant/50 bg-secondary px-6 py-24 text-on-secondary">
          <div className="mx-auto grid w-full max-w-5xl gap-14 md:grid-cols-2 md:items-center">
            <div>
              <p className="label-sm uppercase tracking-[0.14em] text-primary">
                Tus datos, tus reglas
              </p>
              <h2 className="mt-4 font-heading text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.12] tracking-[-0.02em]">
                Lo organizamos para ti,
                <br />
                no para nosotros.
              </h2>
              <p className="mt-5 body-md text-on-secondary/75">
                Tu contexto financiero, ya ordenado, puedes conectarlo a la
                inteligencia artificial que tú elijas. Nosotros no somos el
                dueño de tus datos: somos el puente que te los devuelve.
              </p>
              <p className="mt-4 body-md text-on-secondary/75">
                Y siempre puedes ver quién los leyó y cortarle el acceso.
              </p>
            </div>

            <div className="rounded-2xl border border-on-secondary/15 bg-on-secondary/[0.06] p-6 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-tertiary" />
                <span className="label-sm text-on-secondary/70">
                  Lo que recibe tu agente
                </span>
              </div>
              <pre className="mt-4 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-on-secondary/90">
{`{
  "ruta": "salida-de-deudas",
  "regla": "Cuota de deuda cara
            supera el 30% del ingreso",
  "observado": "32.8%",
  "calidad_datos": {
    "transacciones": 214,
    "confianza": 0.87
  }
}`}
              </pre>
              <p className="mt-4 label-sm text-on-secondary/55">
                Datos verificables, con su nivel de confianza. Nunca una
                conclusión sin la cuenta que la sustenta.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Cierre                                                          */}
        {/* -------------------------------------------------------------- */}
        <section className="relative isolate overflow-hidden px-6 py-28">
          <AmbienteHero />
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
            <Image
              src="/hormiga-cargando-moneda.png"
              alt=""
              width={72}
              height={72}
              className="onboarding-mascot"
            />
            <h2 className="mt-6 font-heading text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.08] tracking-[-0.025em] text-on-surface">
              Empieza donde estás hoy.
            </h2>
            <p className="mt-5 max-w-md body-lg text-on-surface-variant">
              No importa si tienes deudas, si no sabes en qué se te va la plata,
              o si ya te sobra y no sabes qué hacer con ella. El diagnóstico
              decide el camino.
            </p>
            <Link
              href="/login"
              className="mt-10 rounded-full bg-secondary px-9 py-4 label-md text-on-secondary transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              Empieza ahora
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/50 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="label-sm text-on-surface-variant">
            Pa&apos;lante — organiza, diagnostica y hace seguimiento.
          </span>
          <span className="label-sm text-on-surface-variant">
            No es asesoría de inversión.
          </span>
        </div>
      </footer>
    </div>
  );
}
