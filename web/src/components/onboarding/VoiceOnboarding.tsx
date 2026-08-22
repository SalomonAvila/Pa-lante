"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation, useConversationClientTool } from "@elevenlabs/react";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { ConectarGmailButton } from "@/components/auth/ConectarGmailButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FootstepTrail } from "./FootstepTrail";
import type { Completitud } from "@/lib/perfil/completitud";
import type { TipoHallazgo } from "@/types/finance";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

/** Cuánto necesitamos saber antes de dar por terminada la conversación. */
const UMBRAL_COMPLETITUD = 80;

type Turno = { role: "user" | "agent"; text: string };

async function consultarCompletitud(): Promise<Completitud> {
  const res = await fetch("/api/perfil/completitud");
  if (!res.ok) return { porcentaje: 0, camposFaltantes: [] };
  return res.json();
}

function OnboardingInner() {
  const router = useRouter();
  const [transcript, setTranscript] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completitud, setCompletitud] = useState<Completitud | null>(null);

  const conversation = useConversation({
    onMessage: ({ message, role }) =>
      setTranscript((prev) => [...prev, { role, text: message }]),
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

  async function terminarYVerPerfil() {
    await conversation.endSession();
    router.push("/panorama");
  }

  const suficiente = (completitud?.porcentaje ?? 0) >= UMBRAL_COMPLETITUD;

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-surface px-6 py-16">
      <div
        className={`onboarding-mascot flex items-center justify-center rounded-full p-2 ${
          conversation.isListening ? "onboarding-ring" : ""
        }`}
        style={{
          animation:
            conectado && !conversation.isListening
              ? "mascot-breathe 2.4s ease-in-out infinite"
              : undefined,
        }}
      >
        <MascotFeedback mood="cargando" size={120} housed />
      </div>

      <div className="max-w-md text-center">
        <h1 className="headline-md text-on-surface">
          {conectado
            ? conversation.isSpeaking
              ? "Pa'lante está hablando…"
              : "Te escucho"
            : "Antes de todo, conozcámonos"}
        </h1>
        <p className="mt-2 body-md text-on-surface-variant">
          {conectado
            ? "Habla o escribe abajo — lo que te resulte más fácil."
            : "Con qué sueñas, qué meta financiera tienes en mente, cómo están tus finanzas hoy — en el orden que quieras, por voz o por texto."}
        </p>
      </div>

      {conectado && (
        <FootstepTrail active={conversation.isListening || conversation.isSpeaking} />
      )}

      {!conectado && (
        <div className="flex w-full max-w-xs flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={empezarConVoz} disabled={conectando} className="flex-1">
            🎤 Hablar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={empezarConTexto}
            disabled={conectando}
            className="flex-1"
          >
            Escribir
          </Button>
        </div>
      )}

      {error && (
        <p className="body-md text-error" role="alert">
          {error}
        </p>
      )}

      {conectado && (
        <div className="flex w-full max-w-md flex-col gap-3">
          {completitud && (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completitud.porcentaje}%` }}
                />
              </div>
              <p className="text-xs text-on-surface-variant">
                {completitud.porcentaje}% de tu perfil listo
              </p>
            </div>
          )}

          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {transcript.map((turno, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 body-md ${
                  turno.role === "user"
                    ? "self-end rounded-br-md bg-inverse-surface text-inverse-on-surface"
                    : "self-start rounded-bl-md bg-surface-container-low text-on-surface"
                }`}
              >
                {turno.text}
              </div>
            ))}
          </div>

          <form onSubmit={enviarTexto} className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe si prefieres no hablar…"
              className="flex-1 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2.5 body-md text-on-surface outline-none focus:border-2 focus:border-on-surface"
            />
            <Button type="submit" className="shrink-0">
              Enviar
            </Button>
          </form>

          {suficiente ? (
            <Button type="button" onClick={terminarYVerPerfil} className="self-center">
              Ya sé suficiente — ver mi información
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => conversation.endSession()}
              className="self-center label-md text-on-surface-variant underline"
            >
              Terminar conversación
            </button>
          )}
        </div>
      )}

      {transcript.length > 0 && (
        <div className="flex w-full max-w-md flex-col gap-4 border-t border-outline-variant pt-8">
          <p className="text-center body-md text-on-surface-variant">
            También puedes sumar estas fuentes cuando quieras — no reemplazan la conversación, se suman a tu perfil:
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Card elevated className="flex-1">
              <h2 className="font-semibold text-on-surface">Gmail</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Acceso restringido de solo lectura a notificaciones bancarias.
              </p>
              <ConectarGmailButton />
            </Card>
            <Card elevated className="flex-1">
              <h2 className="font-semibold text-on-surface">PDF</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Sube tus extractos bancarios (con clave si aplica).
              </p>
              <Button variant="secondary" className="mt-4 w-full">
                Cargar PDF
              </Button>
            </Card>
          </div>
        </div>
      )}

      {!conectado && (
        <Link href="/intake" className="label-md text-on-surface-variant underline">
          Prefiero conectar directo, sin conversación
        </Link>
      )}
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
