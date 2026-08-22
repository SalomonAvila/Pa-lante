"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MascotFeedback } from "@/components/shared/MascotFeedback";
import { DocumentoUploader } from "@/components/perfil/DocumentoUploader";

type EstadoLado = "idle" | "cargando" | "listo" | "error";

export default function VerificarIdentidadPage() {
  const router = useRouter();
  const [frontalEstado, setFrontalEstado] = useState<EstadoLado>("idle");
  const [posteriorEstado, setPosteriorEstado] = useState<EstadoLado>("idle");
  const [resultado, setResultado] = useState<{ coincide: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(tipo: "cedula_frontal" | "cedula_posterior", archivo: File) {
    const setEstado = tipo === "cedula_frontal" ? setFrontalEstado : setPosteriorEstado;
    setEstado("cargando");
    setError(null);

    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("archivo", archivo);

    const res = await fetch("/api/perfil/documento-identidad", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      setEstado("error");
      setError(data.error ?? "No pudimos procesar el documento.");
      return;
    }

    setEstado("listo");
    if (tipo === "cedula_frontal") {
      setResultado({ coincide: data.coincide });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <MascotFeedback mood="pensando" size={96} housed />
        <h1 className="headline-md text-on-surface">Verifiquemos tu identidad</h1>
        <p className="body-md text-on-surface-variant">
          Necesitamos una foto legible de tu documento para confirmar que los datos que escribiste son
          tuyos.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <DocumentoUploader
          etiqueta="Cédula — lado frontal"
          estado={frontalEstado}
          mensaje={error ?? undefined}
          onArchivoSeleccionado={(archivo) => subir("cedula_frontal", archivo)}
        />
        <DocumentoUploader
          etiqueta="Cédula — lado posterior (si aplica)"
          estado={posteriorEstado}
          onArchivoSeleccionado={(archivo) => subir("cedula_posterior", archivo)}
        />
      </Card>

      {resultado && (
        <Card elevated className="text-center">
          {resultado.coincide ? (
            <p className="body-lg font-medium text-positive">Datos verificados correctamente</p>
          ) : (
            <p className="body-lg font-medium text-error">Necesitamos revisar algunos datos</p>
          )}
        </Card>
      )}

      <Button
        onClick={() => router.push("/registro/autorizacion")}
        disabled={frontalEstado !== "listo"}
        className="self-start disabled:opacity-60"
      >
        Continuar
      </Button>
    </div>
  );
}
