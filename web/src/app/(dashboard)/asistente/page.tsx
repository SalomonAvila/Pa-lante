"use client";

import { useRef, useState } from "react";

type Mensaje = {
  rol: "user" | "assistant";
  contenido: string;
  fuentes?: { fuente: string; tier: string }[];
};

type EventoSSE =
  | { tipo: "conversacion"; conversacionId: string }
  | { tipo: "status"; mensaje: string; expertoId?: string }
  | { tipo: "texto"; delta: string }
  | { tipo: "fuentes"; fuentes: { fuente: string; tier: string }[] }
  | { tipo: "done" }
  | { tipo: "error"; mensaje: string };

/**
 * Chat del orquestador conversacional (Fase 1). Foco en que el backend
 * funcione de verdad — el progreso real de expertos consultándose en
 * paralelo importa más acá que el pulido visual.
 */
export default function AsistentePage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);
  const conversacionIdRef = useRef<string | null>(null);

  async function enviar() {
    const pregunta = input.trim();
    if (!pregunta || enviando) return;

    setInput("");
    setEnviando(true);
    setEstado(null);
    setMensajes((prev) => [...prev, { rol: "user", contenido: pregunta }]);
    setMensajes((prev) => [...prev, { rol: "assistant", contenido: "" }]);

    const fuentesAcumuladas: { fuente: string; tier: string }[] = [];

    try {
      const res = await fetch("/api/conversar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta, conversacionId: conversacionIdRef.current }),
      });

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
          const evento = JSON.parse(linea.slice("data: ".length)) as EventoSSE;

          if (evento.tipo === "conversacion") {
            conversacionIdRef.current = evento.conversacionId;
          } else if (evento.tipo === "status") {
            setEstado(evento.mensaje);
          } else if (evento.tipo === "texto") {
            setMensajes((prev) => {
              const copia = [...prev];
              const ultimo = copia[copia.length - 1];
              copia[copia.length - 1] = { ...ultimo, contenido: ultimo.contenido + evento.delta };
              return copia;
            });
          } else if (evento.tipo === "fuentes") {
            fuentesAcumuladas.push(...evento.fuentes);
          } else if (evento.tipo === "error") {
            setEstado(null);
            setMensajes((prev) => {
              const copia = [...prev];
              copia[copia.length - 1] = {
                ...copia[copia.length - 1],
                contenido: copia[copia.length - 1].contenido || `No pude completar la respuesta: ${evento.mensaje}`,
              };
              return copia;
            });
          } else if (evento.tipo === "done") {
            setEstado(null);
            setMensajes((prev) => {
              const copia = [...prev];
              copia[copia.length - 1] = { ...copia[copia.length - 1], fuentes: fuentesAcumuladas };
              return copia;
            });
          }
        }
      }
    } catch (error) {
      setEstado(null);
      setMensajes((prev) => {
        const copia = [...prev];
        copia[copia.length - 1] = {
          ...copia[copia.length - 1],
          contenido: error instanceof Error ? `Algo falló: ${error.message}` : "Algo falló.",
        };
        return copia;
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="headline-md text-on-surface">Asistente</h1>
        <p className="body-md text-on-surface-variant">
          Pregúntale por tus finanzas — consulta a los expertos que hagan falta y te dice de dónde
          sale cada dato. No da asesoría de inversión.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        {mensajes.length === 0 && (
          <p className="body-md text-on-surface-variant">
            Por ejemplo: &ldquo;¿cómo están mis finanzas?&rdquo; o &ldquo;¿estoy gastando demasiado en algo?&rdquo;
          </p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={m.rol === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.rol === "user"
                  ? "max-w-[80%] rounded-lg bg-primary px-4 py-2 text-on-primary body-md"
                  : "max-w-[80%] rounded-lg bg-surface-container px-4 py-2 text-on-surface body-md whitespace-pre-wrap"
              }
            >
              {m.contenido || (enviando && i === mensajes.length - 1 ? "…" : "")}
              {m.fuentes && m.fuentes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 border-t border-outline-variant pt-2">
                  {m.fuentes.map((f, j) => (
                    <span
                      key={j}
                      className="label-sm rounded-full bg-surface-container-high px-2 py-0.5 text-on-surface-variant"
                    >
                      {f.fuente} · tier {f.tier}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {estado && <p className="label-sm text-on-surface-variant">{estado}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={enviando}
          className="flex-1 rounded-lg border border-outline bg-surface-container-lowest px-4 py-3 body-md text-on-surface outline-none focus-visible:border-primary"
        />
        <button
          type="submit"
          disabled={enviando || !input.trim()}
          className="rounded-lg bg-primary px-5 py-3 body-md font-bold text-on-primary disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
