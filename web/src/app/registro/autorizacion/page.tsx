"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConsentimientoBlock, TEXTOS_CONSENTIMIENTO } from "@/components/perfil/ConsentimientoBlock";
import type { TipoConsentimiento } from "@/lib/perfil/consentimientos";

const ORDEN: TipoConsentimiento[] = [
  "tratamiento_basico",
  "perfil_financiero",
  "conexion_externa",
  "procesamiento_documentos",
  "lectura_correo_otp",
];

export default function AutorizacionPage() {
  const router = useRouter();
  const [aceptados, setAceptados] = useState<Record<TipoConsentimiento, boolean>>({
    tratamiento_basico: false,
    perfil_financiero: false,
    conexion_externa: false,
    procesamiento_documentos: false,
    lectura_correo_otp: false,
  });
  const [enviando, setEnviando] = useState(false);

  const obligatoriosCompletos = ORDEN.filter((tipo) => !TEXTOS_CONSENTIMIENTO[tipo].opcional).every(
    (tipo) => aceptados[tipo],
  );

  async function continuar() {
    setEnviando(true);
    await Promise.all(
      ORDEN.filter((tipo) => aceptados[tipo]).map((tipo) =>
        fetch("/api/perfil/consentimiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo, finalidades: TEXTOS_CONSENTIMIENTO[tipo].finalidades }),
        }),
      ),
    );
    router.push("/perfil/construyendo");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 py-12">
      <div>
        <h1 className="headline-md text-on-surface">Autoricemos el uso de tu información</h1>
        <p className="mt-1 body-md text-on-surface-variant">
          Cada permiso es independiente — puedes revisarlos y revocarlos después desde Configuración →
          Privacidad.
        </p>
      </div>

      {ORDEN.map((tipo) => (
        <ConsentimientoBlock
          key={tipo}
          tipo={tipo}
          checked={aceptados[tipo]}
          onChange={(checked) => setAceptados((a) => ({ ...a, [tipo]: checked }))}
        />
      ))}

      <Button
        onClick={continuar}
        disabled={!obligatoriosCompletos || enviando}
        className="self-start disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Continuar"}
      </Button>
    </div>
  );
}
