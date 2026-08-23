"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation, useConversationClientTool } from "@elevenlabs/react";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import { BackHomeButton } from "@/components/shared/BackHomeButton";
import { AvatarUsuario } from "@/components/auth/AvatarUsuario";
import { Button } from "@/components/ui/Button";
import { ReactiveVoiceCircle } from "./ReactiveVoiceCircle";
import type { Completitud } from "@/lib/perfil/completitud";
import type { TipoHallazgo } from "@/types/finance";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

/** Cuánto necesitamos saber antes de dar por terminada la conversación. */
const UMBRAL_COMPLETITUD = 80;

/**
 * Voces disponibles para el agente — el agente en ElevenLabs tiene habilitado
 * el override de tts.voice_id por sesión (platform_settings.overrides), así
 * que esto no cambia la personalidad/prompt, solo con qué voz habla.
 */
const VOCES = [
  { id: "wKvrrFnAmhvpNRpZkbmh", nombre: "Diana", descripcion: "Colombiana, cálida" },
  { id: "xzUwWse1B1nyc4pXhaLG", nombre: "Andrés", descripcion: "Argentino, calmado" },
  { id: "RjnDg9S3IUlYzp0QIp3R", nombre: "Johana", descripcion: "Latina, calmada" },
  { id: "zsjfif2v09thEBtkBYFe", nombre: "Yeiden", descripcion: "Latino, cálido" },
] as const;

async function consultarCompletitud(): Promise<Completitud> {
  const res = await fetch("/api/perfil/completitud");
  if (!res.ok) return { porcentaje: 0, camposFaltantes: [] };
  return res.json();
}

function OnboardingInner() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completitud, setCompletitud] = useState<Completitud | null>(null);
  const [vozId, setVozId] = useState<string>(VOCES[0].id);

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
        overrides: { tts: { voiceId: vozId } },
        dynamicVariables: {
          porcentaje_completado: inicial.porcentaje,
          campos_faltantes: inicial.camposFaltantes.join(", ") || "ninguno todavía",
        },
      });
    } catch {
      setError("No pudimos acceder al micrófono. Puedes escribir en su lugar.");
    }
  }, [conversation, vozId]);

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
        overrides: { tts: { voiceId: vozId } },
        dynamicVariables: {
          porcentaje_completado: inicial.porcentaje,
          campos_faltantes: inicial.camposFaltantes.join(", ") || "ninguno todavía",
        },
      });
      setMostrarTexto(true);
    } catch {
      setError("No pudimos iniciar la conversación. Intenta de nuevo.");
    }
  }, [conversation, vozId]);

  function enviarTexto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valor = texto.trim();
    if (!valor) return;
    conversation.sendUserMessage(valor);
    setTexto("");
  }

  // Apenas se da por completa la conversación, se pasa a la pantalla de
  // progreso real de los expertos (/intake/progreso) — ya no se muestra un
  // resumen estático acá.
  async function terminarYVerPerfil() {
    await conversation.endSession();
    router.push("/intake/progreso");
  }

  const suficiente = (completitud?.porcentaje ?? 0) >= UMBRAL_COMPLETITUD;

  // --- Grabando: pantalla blanca e inmersiva, el círculo domina, nada más.
  if (conectado) {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-10 bg-white px-6 py-16">
        <BackHomeButton theme="light" />
        <AvatarUsuario theme="light" flotante />
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
      <AvatarUsuario theme="dark" flotante />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <ReactiveVoiceCircle conversation={conversation} theme="dark" />

        <div className="max-w-md text-center">
          <h1 className="headline-md">Antes de todo, conozcámonos</h1>
          <p className="mt-2 body-md text-white/70">
            Con qué sueñas, qué meta financiera tienes en mente, cómo están tus finanzas hoy — en el orden que
            quieras, por voz o por texto.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-white/40">Elige una voz</p>
          <div className="flex flex-wrap justify-center gap-2">
            {VOCES.map((voz) => (
              <button
                key={voz.id}
                type="button"
                onClick={() => setVozId(voz.id)}
                disabled={conectando}
                aria-pressed={vozId === voz.id}
                title={voz.descripcion}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300 ${
                  vozId === voz.id
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                }`}
              >
                {voz.nombre}
              </button>
            ))}
          </div>
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
