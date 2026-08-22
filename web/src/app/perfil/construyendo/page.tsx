"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { TablaFuentes } from "@/components/perfil/TablaFuentes";
import { ESTADOS_TERMINALES, type ConexionFuente } from "@/lib/conectores/tipos";
import type { PayloadAccion } from "@/lib/conectores/orquestador";

const INTERVALO_MS = 1500;

export default function ConstruyendoPerfilPage() {
  const router = useRouter();
  const [conexiones, setConexiones] = useState<ConexionFuente[] | null>(null);
  const iniciado = useRef(false);

  const refrescar = useCallback(async () => {
    const res = await fetch("/api/perfil/conexiones/estado");
    if (!res.ok) return;
    const data = await res.json();
    setConexiones(data.conexiones);
  }, []);

  useEffect(() => {
    async function arrancar() {
      if (iniciado.current) return;
      iniciado.current = true;

      const res = await fetch("/api/perfil/conexiones/estado");
      const data = await res.json();
      if ((data.conexiones ?? []).length === 0) {
        const iniciarRes = await fetch("/api/perfil/conexiones/iniciar", { method: "POST" });
        const iniciarData = await iniciarRes.json();
        setConexiones(iniciarData.conexiones);
      } else {
        setConexiones(data.conexiones);
      }
    }
    arrancar();
  }, []);

  useEffect(() => {
    const id = setInterval(refrescar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [refrescar]);

  async function resolverAccion(conexionId: string, payload: PayloadAccion) {
    await fetch(`/api/perfil/conexiones/${conexionId}/accion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    refrescar();
  }

  async function reintentar(conexionId: string) {
    await fetch(`/api/perfil/conexiones/${conexionId}/reintentar`, { method: "POST" });
    refrescar();
  }

  if (!conexiones) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 py-16 text-center">
        <MascotFeedback mood="cargando" size={96} housed />
        <p className="body-md text-on-surface-variant">Conectando tus fuentes…</p>
      </div>
    );
  }

  const completadas = conexiones.filter((c) => ESTADOS_TERMINALES.includes(c.estado)).length;
  const progreso = conexiones.length > 0 ? completadas / conexiones.length : 0;
  const todoListo = completadas === conexiones.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <MascotFeedback mood="cargando" size={96} housed />
        <h1 className="headline-md text-on-surface">Construyendo tu perfil financiero</h1>
        <p className="max-w-md body-md text-on-surface-variant">
          Podemos conectar diferentes fuentes para ayudarte a entender tu situación financiera sin que
          tengas que recopilar toda la información manualmente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="label-md text-on-surface-variant">
            {completadas} de {conexiones.length} fuentes procesadas
          </span>
          <span className="label-md text-on-surface">{Math.round(progreso * 100)}%</span>
        </div>
        <ProgressBar value={progreso} complete={todoListo} />
      </div>

      <TablaFuentes conexiones={conexiones} onResolverAccion={resolverAccion} onReintentar={reintentar} />

      <Button onClick={() => router.push("/perfil/cuentas")} className="self-start">
        {todoListo ? "Continuar" : "Continuar de todas formas"}
      </Button>
    </div>
  );
}
