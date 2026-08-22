"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { CATALOGO_FUENTES } from "@/lib/conectores/catalogo";
import type { ConexionFuente } from "@/lib/conectores/tipos";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/components/perfil/TablaFuentes";
import { TEXTOS_CONSENTIMIENTO } from "@/components/perfil/ConsentimientoBlock";
import type { TipoConsentimiento } from "@/lib/perfil/consentimientos";

type EventoConsentimiento = {
  id: string;
  tipo: TipoConsentimiento;
  version: string;
  otorgado: boolean;
  creadoEn: string;
};

type DatosPrivacidad = {
  conexiones: ConexionFuente[];
  consentimientos: EventoConsentimiento[];
  sesionExpira: string | null;
};

async function obtenerDatosPrivacidad(supabase: SupabaseClient): Promise<DatosPrivacidad> {
  const [resConexiones, resConsentimientos, { data: sessionData }] = await Promise.all([
    fetch("/api/perfil/conexiones/estado").then((r) => r.json()),
    fetch("/api/perfil/consentimiento").then((r) => r.json()),
    supabase.auth.getSession(),
  ]);
  return {
    conexiones: resConexiones.conexiones ?? [],
    consentimientos: resConsentimientos.consentimientos ?? [],
    sesionExpira: sessionData.session?.expires_at
      ? new Date(sessionData.session.expires_at * 1000).toLocaleString("es-CO")
      : null,
  };
}

export default function PrivacidadPage() {
  const [conexiones, setConexiones] = useState<ConexionFuente[]>([]);
  const [consentimientos, setConsentimientos] = useState<EventoConsentimiento[]>([]);
  const [sesionExpira, setSesionExpira] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let cancelado = false;
    obtenerDatosPrivacidad(supabase).then((datos) => {
      if (cancelado) return;
      setConexiones(datos.conexiones);
      setConsentimientos(datos.consentimientos);
      setSesionExpira(datos.sesionExpira);
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarga]);

  async function desconectar(id: string) {
    await fetch(`/api/perfil/conexiones/${id}`, { method: "DELETE" });
    setRecarga((r) => r + 1);
  }

  async function revocar(tipo: TipoConsentimiento) {
    await fetch("/api/perfil/consentimiento", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    });
    setRecarga((r) => r + 1);
  }

  if (cargando) {
    return <p className="body-md text-on-surface-variant">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="headline-md text-on-surface">Privacidad y conexiones</h1>
        <p className="mt-1 body-md text-on-surface-variant">
          Revisa qué fuentes están conectadas, qué autorizaste y desconecta lo que ya no quieras
          compartir.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="label-md text-on-surface-variant">Fuentes conectadas</h2>
        <Table>
          <Thead>
            <tr>
              <Th>Fuente</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {conexiones.map((c) => {
              const fuente = CATALOGO_FUENTES.find((f) => f.id === c.fuenteId);
              return (
                <Tr key={c.id}>
                  <Td>{fuente?.nombre ?? c.fuenteId}</Td>
                  <Td>
                    <span className={`label-sm ${ESTADO_COLOR[c.estado]}`}>{ESTADO_LABEL[c.estado]}</span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => desconectar(c.id)}
                      className="label-sm text-error underline"
                    >
                      Desconectar
                    </button>
                  </Td>
                </Tr>
              );
            })}
            {conexiones.length === 0 && (
              <Tr>
                <Td colSpan={3} className="text-on-surface-variant">
                  No hay fuentes conectadas.
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-md text-on-surface-variant">Autorizaciones otorgadas</h2>
        <Table>
          <Thead>
            <tr>
              <Th>Autorización</Th>
              <Th>Estado</Th>
              <Th>Otorgada</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {consentimientos.map((c) => (
              <Tr key={c.id}>
                <Td>{TEXTOS_CONSENTIMIENTO[c.tipo].titulo}</Td>
                <Td>
                  <span className={c.otorgado ? "text-positive" : "text-on-surface-variant"}>
                    {c.otorgado ? "Vigente" : "Revocada"}
                  </span>
                </Td>
                <Td>{new Date(c.creadoEn).toLocaleDateString("es-CO")}</Td>
                <Td>
                  {c.otorgado && (
                    <button
                      type="button"
                      onClick={() => revocar(c.tipo)}
                      className="label-sm text-error underline"
                    >
                      Revocar
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-md text-on-surface-variant">Sesión actual</h2>
        <Card className="flex flex-col gap-1">
          <p className="body-md text-on-surface">Esta sesión expira: {sesionExpira ?? "—"}</p>
          <p className="text-xs text-on-surface-variant">
            Por ahora solo mostramos la sesión con la que estás viendo esta página.
          </p>
        </Card>
      </section>
    </div>
  );
}
