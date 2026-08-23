"use client";

import { useEffect, useRef, useState } from "react";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import { BackHomeButton } from "@/components/shared/BackHomeButton";
import { CerrarSesionButton } from "@/components/auth/CerrarSesionButton";
import type { EventoExpertos } from "@/app/api/expertos/ejecutar/route";
import type { ExpertoId, ExpertResult } from "@/lib/inteligencia/tipos";

type EstadoExperto = "pendiente" | "consultando" | "listo" | "error";

type FilaExperto = {
  id: ExpertoId;
  nombre: string;
  estado: EstadoExperto;
  resultado?: ExpertResult;
};

/**
 * Progreso real de los expertos corriendo contra el perfil que se acaba de
 * capturar por voz — a donde VoiceOnboarding navega apenas la conversación
 * se da por completa (ver terminarYVerPerfil en VoiceOnboarding.tsx).
 */
export default function ProgresoExpertosPage() {
  const [expertos, setExpertos] = useState<FilaExperto[]>([]);
  const [terminado, setTerminado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    async function correr() {
      try {
        const res = await fetch("/api/expertos/ejecutar", { method: "POST" });
        if (!res.body) throw new Error("El servidor no devolvió una respuesta con stream.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const partes = buffer.split("\n\n");
          buffer = partes.pop() ?? "";

          for (const parte of partes) {
            const linea = parte.split("\n").find((l) => l.startsWith("data: "));
            if (!linea) continue;
            const evento = JSON.parse(linea.slice("data: ".length)) as EventoExpertos;

            if (evento.tipo === "lista") {
              setExpertos(evento.expertos.map((e) => ({ id: e.id, nombre: e.nombre, estado: "pendiente" as const })));
            } else if (evento.tipo === "experto_status") {
              setExpertos((prev) => prev.map((e) => (e.id === evento.expertoId ? { ...e, estado: evento.estado } : e)));
            } else if (evento.tipo === "experto_resultado") {
              setExpertos((prev) => prev.map((e) => (e.id === evento.expertoId ? { ...e, resultado: evento.resultado } : e)));
            } else if (evento.tipo === "error") {
              setError(evento.mensaje);
            } else if (evento.tipo === "done") {
              setTerminado(true);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Algo falló consultando a los expertos.");
      }
    }

    correr();
  }, []);

  const listos = expertos.filter((e) => e.estado === "listo" || e.estado === "error").length;
  const progreso = expertos.length > 0 ? listos / expertos.length : 0;

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center gap-8 px-6 py-16 text-white">
      <VideoBackdrop />
      <BackHomeButton theme="dark" />
      <CerrarSesionButton theme="dark" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="headline-md">{terminado ? "Tu análisis está listo" : "Consultando a los expertos…"}</h1>
          <p className="mt-2 body-md text-white/70">
            {terminado
              ? "Cada experto revisó tu perfil con la información que ya tenemos."
              : "Cada experto revisa tu perfil por separado — esto toma unos segundos."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progreso * 100}%` }} />
          </div>
          <p className="text-xs text-white/50">
            {listos} de {expertos.length || "…"} expertos listos
          </p>
        </div>

        {error && (
          <p className="body-md text-error" role="alert">
            {error}
          </p>
        )}

        <div className="flex w-full flex-col gap-3">
          {expertos.map((experto) => (
            <div
              key={experto.id}
              className="flex flex-col gap-1 rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <span className="label-md font-semibold">{experto.nombre}</span>
                <span
                  className={`text-xs ${
                    experto.estado === "listo"
                      ? "text-positive"
                      : experto.estado === "error"
                        ? "text-error"
                        : experto.estado === "consultando"
                          ? "text-white/70"
                          : "text-white/40"
                  }`}
                >
                  {experto.estado === "pendiente" && "En espera…"}
                  {experto.estado === "consultando" && "Consultando…"}
                  {experto.estado === "listo" && "Listo"}
                  {experto.estado === "error" && "No se pudo completar"}
                </span>
              </div>
              {experto.resultado && (
                <p className="text-sm text-white/70">{experto.resultado.resumen}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
