"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";

type Estado = "idle" | "cargando" | "listo" | "error";

type Props = {
  etiqueta: string;
  onArchivoSeleccionado: (archivo: File) => void;
  estado?: Estado;
  mensaje?: string;
};

/**
 * Un solo <input type="file"> con `capture` cubre cámara del celular,
 * cámara del computador (según el navegador) y carga de archivo — sin
 * librerías adicionales.
 */
export function DocumentoUploader({ etiqueta, onArchivoSeleccionado, estado = "idle", mensaje }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  function manejarSeleccion(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    onArchivoSeleccionado(archivo);
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-outline-variant p-4">
      <p className="label-md text-on-surface-variant">{etiqueta}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={manejarSeleccion}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          {nombreArchivo ? "Cambiar archivo" : "Tomar foto o subir archivo"}
        </Button>
        {nombreArchivo && <span className="body-md text-on-surface-variant">{nombreArchivo}</span>}
      </div>
      {estado === "cargando" && <p className="text-sm text-on-surface-variant">Procesando…</p>}
      {estado === "listo" && <p className="text-sm text-positive">Recibido.</p>}
      {estado === "error" && <p className="text-sm text-error">{mensaje ?? "No pudimos procesar el archivo."}</p>}
    </div>
  );
}
