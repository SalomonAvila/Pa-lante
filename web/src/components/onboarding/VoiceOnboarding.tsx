"use client";

import { FormEvent, useCallback, useState } from "react";
import { ConversationProvider, useConversation, useConversationClientTool } from "@elevenlabs/react";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import { BackHomeButton } from "@/components/shared/BackHomeButton";
import { ConectarGmailButton } from "@/components/auth/ConectarGmailButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ReactiveVoiceCircle } from "./ReactiveVoiceCircle";
import type { Completitud } from "@/lib/perfil/completitud";
import type { TipoHallazgo } from "@/types/finance";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

/** Cuánto necesitamos saber antes de dar por terminada la conversación. */
const UMBRAL_COMPLETITUD = 80;

type Resumen = {
  porcentajeIngresoVerificado: number | null;
  ingresoMensualVerificado: number | null;
  canonMensualObjetivo: number | null;
  estadoPreparacion: "sin_datos" | "requiere_datos" | "listo_para_compartir";
  objetivoDescripcion: string | null;
};

function formatoCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    valor,
  );
}

async function consultarCompletitud(): Promise<Completitud> {
  const res = await fetch("/api/perfil/completitud");
  if (!res.ok) return { porcentaje: 0, camposFaltantes: [] };
  return res.json();
}

function OnboardingInner() {
  const [texto, setTexto] = useState("");
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completitud, setCompletitud] = useState<Completitud | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  const conversation = useConversation({
    onError: (message) => setError(message),
  });

  // El agente llama esto por cada dato que extrae de la respuesta del
  // usuario — se guarda de inmediato, no al terminar la conversación.
  useConversationClientTool("guardar_hallazgo", async (params) => {
    const { tipo, datos, periodo } = params as {
      tipo: TipoHallazgo;
      datos: Record<string, unknown>;
      periodo?: string;
    };
    await fetch("/api/perfil/conversacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, datos, periodo }),
    });
    const nueva = await consultarCompletitud();
    setCompletitud(nueva);
    return JSON.stringify(nueva);
  });

  // El agente lo llama después de guardar un dato, para decidir la siguiente
  // pregunta con el % y los campos que aún faltan — no hay guion fijo, cada
  // pregunta se decide con esto en la mano.
  useConversationClientTool("consultar_completitud", async () => {
    const nueva = await consultarCompletitud();
    setCompletitud(nueva);
    return JSON.stringify(nueva);
  });

  const conectado = conversation.status === "connected";
  const conectando = conversation.status === "connecting";

  const empezarConVoz = useCallback(async () => {
    if (!AGENT_ID) {
      setError("Falta configurar el agente de voz.");
      return;
    }
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const inicial = await consultarCompletitud();
      setCompletitud(inicial);
      await conversation.startSession({
        agentId: AGENT_ID,
        dynamicVariables: {
          porcentaje_completado: inicial.porcentaje,
          campos_faltantes: inicial.camposFaltantes.join(", ") || "ninguno todavía",
        },
      });
    } catch {
      setError("No pudimos acceder al micrófono. Puedes escribir en su lugar.");
    }
  }, [conversation]);

  const empezarConTexto = useCallback(async () => {
    if (!AGENT_ID) {
      setError("Falta configurar el agente de voz.");
      return;
    }
    setError(null);
    try {
      const inicial = await consultarCompletitud();
      setCompletitud(inicial);
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "websocket",
        dynamicVariables: {
          porcentaje_completado: inicial.porcentaje,
          campos_faltantes: inicial.camposFaltantes.join(", ") || "ninguno todavía",
        },
      });
      setMostrarTexto(true);
    } catch {
      setError("No pudimos iniciar la conversación. Intenta de nuevo.");
    }
  }, [conversation]);

  function enviarTexto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valor = texto.trim();
    if (!valor) return;
    conversation.sendUserMessage(valor);
    setTexto("");
  }

  // /panorama ya no existe como página propia: el resumen se muestra en la
  // misma pantalla en vez de navegar a otro lado.
  async function terminarYVerPerfil() {
    await conversation.endSession();
    const res = await fetch("/api/perfil/resumen");
    if (res.ok) setResumen(await res.json());
  }

  const suficiente = (completitud?.porcentaje ?? 0) >= UMBRAL_COMPLETITUD;

  // --- Resumen: mismo fondo de video que la landing, resultado + fuentes extra.
  if (resumen) {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
        <VideoBackdrop />
        <BackHomeButton theme="dark" />
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 text-center">
          <h1 className="headline-md">Tu perfil está listo</h1>
          {resumen.objetivoDescripcion && <p className="body-md text-white/70">{resumen.objetivoDescripcion}</p>}

          <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/15 bg-black/40 p-6 backdrop-blur-md">
            <div>
              <span className="text-4xl font-semibold tabular-nums">
                {resumen.porcentajeIngresoVerificado == null
                  ? "—"
                  : `${resumen.porcentajeIngresoVerificado.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`}
              </span>
              <p className="mt-1 text-sm text-white/70">de tu ingreso declarado respaldado por datos observados</p>
            </div>
            {resumen.ingresoMensualVerificado != null && (
              <div>
                <span className="text-xl font-semibold tabular-nums">{formatoCOP(resumen.ingresoMensualVerificado)}</span>
                <p className="text-sm text-white/70">ingreso mensual verificado</p>
              </div>
            )}
            {resumen.canonMensualObjetivo != null && (
              <div>
                <span className="text-xl font-semibold tabular-nums">{formatoCOP(resumen.canonMensualObjetivo)}</span>
                <p className="text-sm text-white/70">canon mensual que quieres demostrar</p>
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Card elevated className="flex-1">
              <h2 className="font-semibold text-on-surface">Gmail</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Súmalo cuando quieras para respaldar más.</p>
              <ConectarGmailButton />
            </Card>
            <Card elevated className="flex-1">
              <h2 className="font-semibold text-on-surface">PDF</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Sube tus extractos bancarios.</p>
              <Button variant="secondary" className="mt-4 w-full">
                Cargar PDF
              </Button>
            </Card>
          </div>

          <button type="button" onClick={() => setResumen(null)} className="label-md text-white/70 underline">
            Volver a la conversación
          </button>
        </div>
      </div>
    );
  }

  // --- Grabando: pantalla blanca e inmersiva, el círculo domina, nada más.
  if (conectado) {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-10 bg-white px-6 py-16">
        <BackHomeButton theme="light" />
        <ReactiveVoiceCircle conversation={conversation} theme="light" size="min(72vw, 62vh)" />

        <p className="text-sm font-medium text-black/50">
          {conversation.isSpeaking ? "Pa'lante está hablando…" : "Te escucho…"}
        </p>

        {error && (
          <p className="body-md text-error" role="alert">
            {error}
          </p>
        )}

        {mostrarTexto ? (
          <form onSubmit={enviarTexto} className="flex w-full max-w-sm gap-2">
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe…"
              className="flex-1 rounded-full border border-black/15 bg-transparent px-4 py-2 text-sm text-black outline-none focus:border-black"
            />
            <Button type="submit" variant="dark" className="shrink-0 px-4 py-2 text-sm">
              Enviar
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarTexto(true)}
            className="text-xs text-black/40 underline"
          >
            Prefiero escribir
          </button>
        )}

        <button
          type="button"
          onClick={terminarYVerPerfil}
          className="text-xs text-black/40 underline"
        >
          {suficiente ? "Ya sé suficiente — ver mi información" : "Terminar conversación"}
        </button>
      </div>
    );
  }

  // --- Reposo: mismo fondo/lenguaje de botones que la landing.
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
      <VideoBackdrop />
      <BackHomeButton theme="dark" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <ReactiveVoiceCircle conversation={conversation} theme="dark" />

        <div className="max-w-md text-center">
          <h1 className="headline-md">Antes de todo, conozcámonos</h1>
          <p className="mt-2 body-md text-white/70">
            Con qué sueñas, qué meta financiera tienes en mente, cómo están tus finanzas hoy — en el orden que
            quieras, por voz o por texto.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={empezarConVoz} disabled={conectando} className="flex-1">
            🎤 Hablar
          </Button>
          <Button type="button" variant="secondary" onClick={empezarConTexto} disabled={conectando} className="flex-1">
            Escribir
          </Button>
        </div>

        {error && (
          <p className="body-md text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function VoiceOnboarding() {
  return (
    <ConversationProvider>
      <OnboardingInner />
    </ConversationProvider>
  );
}
