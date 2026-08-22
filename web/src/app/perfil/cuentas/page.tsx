"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DocumentoUploader } from "@/components/perfil/DocumentoUploader";

type HallazgoPropuesto = {
  tipo: string;
  descripcion: string;
  valor: number;
  fecha?: string;
  incluir: boolean;
};

type Propuesta = {
  documentoId: string;
  bancoDetectado: string | null;
  periodoDetectado: string | null;
  hallazgos: HallazgoPropuesto[];
};

export default function CuentasPage() {
  const router = useRouter();
  const [banco, setBanco] = useState("");
  const [tipoProducto, setTipoProducto] = useState("cuenta_ahorros");
  const [alias, setAlias] = useState("");
  const [cuentasGuardadas, setCuentasGuardadas] = useState<string[]>([]);
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);

  const [subiendo, setSubiendo] = useState(false);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agregarCuenta(e: FormEvent) {
    e.preventDefault();
    if (!banco) return;
    setGuardandoCuenta(true);
    const res = await fetch("/api/perfil/cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banco, tipoProducto, alias: alias || undefined }),
    });
    setGuardandoCuenta(false);
    if (res.ok) {
      setCuentasGuardadas((c) => [...c, `${banco} — ${tipoProducto}`]);
      setBanco("");
      setAlias("");
    }
  }

  async function subirDocumento(tipo: "extracto" | "captura", archivo: File) {
    setSubiendo(true);
    setError(null);
    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("archivo", archivo);

    const res = await fetch("/api/perfil/documentos", { method: "POST", body: formData });
    const data = await res.json();
    setSubiendo(false);

    if (!res.ok) {
      setError(data.error ?? "No pudimos procesar el documento.");
      return;
    }

    setPropuesta({
      documentoId: data.documentoId,
      bancoDetectado: data.bancoDetectado,
      periodoDetectado: data.periodoDetectado,
      hallazgos: data.hallazgos.map(
        (h: { tipo: string; descripcion: string; valor: number; fecha?: string }) => ({
          ...h,
          incluir: true,
        }),
      ),
    });
  }

  function actualizarHallazgo(indice: number, cambios: Partial<HallazgoPropuesto>) {
    setPropuesta((p) => {
      if (!p) return p;
      const hallazgos = [...p.hallazgos];
      hallazgos[indice] = { ...hallazgos[indice], ...cambios };
      return { ...p, hallazgos };
    });
  }

  async function confirmarHallazgos() {
    if (!propuesta) return;
    setConfirmando(true);
    const incluidos = propuesta.hallazgos.filter((h) => h.incluir);
    await fetch(`/api/perfil/documentos/${propuesta.documentoId}/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hallazgos: incluidos }),
    });
    setConfirmando(false);
    setPropuesta(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 py-12">
      <div>
        <h1 className="headline-md text-on-surface">Agrega tus cuentas financieras</h1>
        <p className="mt-1 body-md text-on-surface-variant">
          Suma lo que las fuentes automáticas no puedan ver: cuentas, tarjetas o inversiones que manejes
          a mano.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="label-md text-on-surface-variant">Cuenta o producto</h2>
        <form onSubmit={agregarCuenta} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Banco" required value={banco} onChange={(e) => setBanco(e.target.value)} />
          <Select
            label="Tipo de producto"
            value={tipoProducto}
            onChange={(e) => setTipoProducto(e.target.value)}
          >
            <option value="cuenta_ahorros">Cuenta de ahorros</option>
            <option value="cuenta_corriente">Cuenta corriente</option>
            <option value="tarjeta">Tarjeta de crédito</option>
            <option value="credito">Crédito</option>
            <option value="inversion">Inversión</option>
            <option value="otro">Otro</option>
          </Select>
          <Input
            label="Alias (opcional)"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="sm:col-span-2"
          />
          <Button type="submit" disabled={guardandoCuenta} className="self-start sm:col-span-2 disabled:opacity-60">
            {guardandoCuenta ? "Agregando…" : "Agregar cuenta"}
          </Button>
        </form>
        {cuentasGuardadas.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-on-surface-variant">
            {cuentasGuardadas.map((c, i) => (
              <li key={i}>✓ {c}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="label-md text-on-surface-variant">Subir extracto o captura</h2>
        <DocumentoUploader
          etiqueta="Extracto (PDF) o captura (PNG/JPG)"
          estado={subiendo ? "cargando" : error ? "error" : "idle"}
          mensaje={error ?? undefined}
          onArchivoSeleccionado={(archivo) => subirDocumento("extracto", archivo)}
        />
      </Card>

      {propuesta && (
        <Card elevated className="flex flex-col gap-4">
          <h2 className="label-md text-on-surface-variant">Encontramos esta información</h2>
          {propuesta.bancoDetectado && (
            <p className="text-sm text-on-surface-variant">
              Banco detectado: <strong>{propuesta.bancoDetectado}</strong>
              {propuesta.periodoDetectado && ` · Periodo: ${propuesta.periodoDetectado}`}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {propuesta.hallazgos.map((h, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-3 border-b border-outline-variant/40 pb-3 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={h.incluir}
                  onChange={(e) => actualizarHallazgo(i, { incluir: e.target.checked })}
                />
                <Input
                  label="Descripción"
                  value={h.descripcion}
                  onChange={(e) => actualizarHallazgo(i, { descripcion: e.target.value })}
                  className="flex-1"
                />
                <Input
                  label="Valor"
                  type="number"
                  value={h.valor}
                  onChange={(e) => actualizarHallazgo(i, { valor: Number(e.target.value) })}
                  className="w-32"
                />
              </div>
            ))}
          </div>
          <Button onClick={confirmarHallazgos} disabled={confirmando} className="self-start disabled:opacity-60">
            {confirmando ? "Guardando…" : "Confirmar"}
          </Button>
        </Card>
      )}

      <Button onClick={() => router.push("/perfil/listo")} variant="secondary" className="self-start">
        Continuar
      </Button>
    </div>
  );
}
