"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import { BackHomeButton } from "@/components/shared/BackHomeButton";
import { AvatarUsuario } from "@/components/auth/AvatarUsuario";

const PASOS = ["Consolidando tus datos", "Interpretando tu contexto", "Preparando controles de privacidad"];

export default function ProgresoPerfilPage() {
  const router = useRouter();
  const iniciado = useRef(false);
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    const timer = window.setInterval(() => setPaso((actual) => Math.min(actual + 1, PASOS.length - 1)), 1200);
    async function generar() {
      try {
        const respuesta = await fetch("/api/perfil/generar", { method: "POST" });
        const datos = await respuesta.json().catch(() => null);
        if (!respuesta.ok) throw new Error(datos?.error ?? "No pudimos generar tu perfil.");
        setPaso(PASOS.length);
        window.clearInterval(timer);
        window.setTimeout(() => router.replace("/portal"), 650);
      } catch (e) {
        window.clearInterval(timer);
        setError(e instanceof Error ? e.message : "No pudimos generar tu perfil.");
      }
    }
    void generar();
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16 text-white">
      <VideoBackdrop />
      <BackHomeButton theme="dark" />
      <AvatarUsuario theme="dark" flotante />
      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-white/15 bg-black/45 p-8 text-center backdrop-blur-xl">
        <p className="label-md text-primary">TU PERFIL FINANCIERO</p>
        <h1 className="headline-lg mt-3">Estamos conectando los puntos</h1>
        <p className="body-md mt-3 text-white/70">Usamos lo que nos contaste, tus datos y sus fuentes. Nunca completamos vacíos con suposiciones.</p>
        <div className="mt-8 flex flex-col gap-3 text-left">
          {PASOS.map((texto, indice) => {
            const listo = paso > indice;
            const activo = paso === indice;
            return (
              <div key={texto} className={`flex items-center gap-3 rounded-xl border p-4 ${listo ? "border-positive/40 bg-positive/10" : activo ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5"}`}>
                <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-sm">{listo ? "✓" : indice + 1}</span>
                <span className={activo || listo ? "text-white" : "text-white/45"}>{texto}</span>
              </div>
            );
          })}
        </div>
        {error && (
          <div className="mt-6 rounded-xl bg-error/15 p-4 text-left text-sm text-error">
            <p>{error}</p>
            <button type="button" className="mt-3 font-semibold underline" onClick={() => window.location.reload()}>Intentar de nuevo</button>
          </div>
        )}
      </section>
    </main>
  );
}
