"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import { BackHomeButton } from "@/components/shared/BackHomeButton";
import { AvatarUsuario } from "@/components/auth/AvatarUsuario";

const PASOS = ["Consolidando tus datos", "Interpretando tu contexto", "Preparando controles de privacidad"];

export default function ProgresoPerfilPage() {
  const iniciado = useRef(false);
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [perfilListo, setPerfilListo] = useState(false);

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
        setPerfilListo(true);
        window.clearInterval(timer);
      } catch (e) {
        window.clearInterval(timer);
        setError(e instanceof Error ? e.message : "No pudimos generar tu perfil.");
      }
    }
    void generar();
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16 text-white">
      <VideoBackdrop />
      <BackHomeButton theme="dark" />
      <AvatarUsuario theme="dark" flotante />
      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-white/15 bg-black/45 p-8 text-center backdrop-blur-xl">
        <p className="label-md text-primary">TU PERFIL FINANCIERO</p>
        <h1 className="headline-lg mt-3">{perfilListo ? "Tu perfil está listo" : "Estamos conectando los puntos"}</h1>
        <p className="body-md mt-3 text-white/70">{perfilListo ? "Ya puedes revisarlo o llevar este contexto a la IA con la que prefieras continuar." : "Usamos lo que nos contaste, tus datos y sus fuentes. Nunca completamos vacíos con suposiciones."}</p>
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
        {perfilListo && (
          <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
            <Link href="/portal" className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-center font-semibold text-on-primary">Ver mi perfil</Link>
            <Link href="/portal?section=integraciones&platform=claude" className="flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-center text-sm font-semibold text-white">Agregar MCP a Claude</Link>
            <Link href="/portal?section=integraciones&platform=chatgpt" className="flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-center text-sm font-semibold text-white sm:col-span-2">Preparar MCP para ChatGPT <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">BETA</span></Link>
          </div>
        )}
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
