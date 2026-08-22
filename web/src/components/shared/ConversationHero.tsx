"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MascotFeedback } from "@/components/shared/MascotFeedback";

function AntBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <MascotFeedback mood="cargando" size={36} housed />
      <div className="max-w-[85%] rounded-lg rounded-bl-none bg-surface-container-low px-4 py-3 body-md text-on-surface">
        {children}
      </div>
    </div>
  );
}

function VisitorBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg rounded-br-none bg-primary px-4 py-3 body-md text-on-primary">
        {children}
      </div>
    </div>
  );
}

export function ConversationHero() {
  const [situation, setSituation] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = situation.trim();
    if (!value) return;
    setSubmitted(value);
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <AntBubble>
        Hola, soy Pa&apos;lante. Cuéntame qué está pasando con tus finanzas
        ahora mismo, con tus propias palabras.
      </AntBubble>

      {!submitted && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="situation"
              className="label-md text-on-surface-variant"
            >
              Tu situación
            </label>
            <textarea
              id="situation"
              name="situation"
              rows={2}
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              placeholder="Ej: tengo una deuda de tarjeta de crédito que no logro bajar…"
              className="rounded border border-outline-variant bg-surface-container-low px-4 py-2 body-md text-on-surface outline-none focus:border-2 focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="self-end rounded bg-primary px-6 py-3 label-md text-on-primary transition-colors duration-500 hover:bg-primary/90 active:scale-[0.98]"
          >
            Contarle a Pa&apos;lante
          </button>
        </form>
      )}

      {submitted && (
        <>
          <VisitorBubble>{submitted}</VisitorBubble>
          <AntBubble>
            Listo. Con esto armamos un plan hecho a tu medida — no una
            plantilla de casillas fijas. Para verlo, conecta el contexto real
            de tus finanzas:
          </AntBubble>
          <div className="flex flex-col gap-3 pl-11 sm:flex-row">
            <Link
              href="/intake"
              className="rounded bg-primary px-6 py-3 text-center label-md text-on-primary transition-colors duration-500 hover:bg-primary/90 active:scale-[0.98]"
            >
              Conectar Gmail
            </Link>
            <Link
              href="/intake"
              className="rounded border-2 border-primary px-6 py-3 text-center label-md text-primary transition-colors duration-500 hover:bg-primary-container/10 active:scale-[0.98]"
            >
              Cargar extracto en PDF
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
