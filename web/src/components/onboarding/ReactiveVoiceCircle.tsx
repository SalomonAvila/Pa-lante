"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { useConversation } from "@elevenlabs/react";

type Conversacion = ReturnType<typeof useConversation>;

type Props = {
  conversation: Conversacion;
  size?: number | string;
  /** "dark" = pensado para el fondo de video (screen blend, núcleo blanco).
   *  "light" = para fondo blanco (multiply blend, sin núcleo artificial). */
  theme?: "dark" | "light";
};

type EstiloConHue = CSSProperties & { "--hue": number };

/**
 * Círculo de voz reactivo, al estilo del modo de voz de ChatGPT: tres capas
 * de gradiente radial cuyo tamaño/matiz/opacidad se leen en vivo del audio
 * real (getInput/OutputVolume + ByteFrequencyData del SDK de ElevenLabs) —
 * no es un loop CSS precocido. Se actualiza vía requestAnimationFrame
 * mutando estilos por ref (no por estado de React, para no re-renderizar
 * 60 veces por segundo). Sigue siendo CSS puro, sin canvas ni WebGL.
 */
export function ReactiveVoiceCircle({ conversation, size = 220, theme = "dark" }: Props) {
  const capaBajaRef = useRef<HTMLDivElement>(null);
  const capaMediaRef = useRef<HTMLDivElement>(null);
  const capaAltaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    function promedioBanda(datos: Uint8Array, desde: number, hasta: number): number {
      let suma = 0;
      for (let i = desde; i < hasta; i++) suma += datos[i];
      return suma / (hasta - desde) / 255; // normaliza a 0..1
    }

    function aplicarCapa(el: HTMLDivElement | null, magnitud: number, nivel: number, hueBase: number) {
      if (!el) return;
      const escala = 0.75 + magnitud * 0.6 + nivel * 0.25;
      const opacidad = 0.35 + magnitud * 0.5;
      const hue = hueBase + magnitud * 40;
      el.style.setProperty("--escala", escala.toFixed(3));
      el.style.setProperty("--opacidad", opacidad.toFixed(3));
      el.style.setProperty("--hue", hue.toFixed(1));
    }

    function tick() {
      frameRef.current = requestAnimationFrame(tick);
      if (conversation.status !== "connected") return;

      const entrada = conversation.getInputVolume();
      const salida = conversation.getOutputVolume();
      const nivel = Math.max(entrada, salida);

      // Cuando el agente habla, reacciona a su voz; cuando escucha, a la
      // del usuario — así el color/forma responde a quien esté sonando.
      const frecuencias =
        salida > entrada ? conversation.getOutputByteFrequencyData() : conversation.getInputByteFrequencyData();
      const tercio = Math.max(1, Math.floor(frecuencias.length / 3));
      const baja = promedioBanda(frecuencias, 0, tercio);
      const media = promedioBanda(frecuencias, tercio, tercio * 2);
      const alta = promedioBanda(frecuencias, tercio * 2, frecuencias.length);

      aplicarCapa(capaBajaRef.current, baja, nivel, 210); // azul
      aplicarCapa(capaMediaRef.current, media, nivel, 300); // violeta
      aplicarCapa(capaAltaRef.current, alta, nivel, 20); // coral
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [conversation]);

  return (
    <div
      className="reactive-circle-wrap relative flex items-center justify-center"
      data-theme={theme}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div ref={capaBajaRef} className="reactive-circle-layer" style={{ "--hue": 210 } as EstiloConHue} />
      <div ref={capaMediaRef} className="reactive-circle-layer" style={{ "--hue": 300 } as EstiloConHue} />
      <div ref={capaAltaRef} className="reactive-circle-layer" style={{ "--hue": 20 } as EstiloConHue} />
      <div className="reactive-circle-core" />
    </div>
  );
}
