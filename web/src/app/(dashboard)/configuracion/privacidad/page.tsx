"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  tokensMcp: TokenMcp[];
  accesosMcp: AccesoMcp[];
};

type TokenMcp = {
  id: string;
  nombre: string;
  prefijo: string;
  ultimo_uso: string | null;
  revocado_en: string | null;
  creado_en: string;
};

type AccesoMcp = {
  id: string;
  token_id: string | null;
  herramienta: string;
  exito: boolean;
  creado_en: string;
};

async function obtenerDatosPrivacidad(supabase: SupabaseClient): Promise<DatosPrivacidad> {
  const [resConexiones, resConsentimientos, resMcp, { data: sessionData }] = await Promise.all([
    fetch("/api/perfil/conexiones/estado").then((r) => r.json()),
    fetch("/api/perfil/consentimiento").then((r) => r.json()),
    fetch("/api/mcp/tokens").then((r) => r.json()),
    supabase.auth.getSession(),
  ]);
  return {
    conexiones: resConexiones.conexiones ?? [],
    consentimientos: resConsentimientos.consentimientos ?? [],
    tokensMcp: resMcp.tokens ?? [],
    accesosMcp: resMcp.accesos ?? [],
    sesionExpira: sessionData.session?.expires_at
      ? new Date(sessionData.session.expires_at * 1000).toLocaleString("es-CO")
      : null,
  };
}

export default function PrivacidadPage() {
  const [conexiones, setConexiones] = useState<ConexionFuente[]>([]);
  const [consentimientos, setConsentimientos] = useState<EventoConsentimiento[]>([]);
  const [sesionExpira, setSesionExpira] = useState<string | null>(null);
  const [tokensMcp, setTokensMcp] = useState<TokenMcp[]>([]);
  const [accesosMcp, setAccesosMcp] = useState<AccesoMcp[]>([]);
  const [nombreToken, setNombreToken] = useState("Claude Desktop");
  const [tokenNuevo, setTokenNuevo] = useState<string | null>(null);
  const [procesandoToken, setProcesandoToken] = useState(false);
  const [errorToken, setErrorToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelado = false;
    obtenerDatosPrivacidad(supabase).then((datos) => {
      if (cancelado) return;
      setConexiones(datos.conexiones);
      setConsentimientos(datos.consentimientos);
      setSesionExpira(datos.sesionExpira);
      setTokensMcp(datos.tokensMcp);
      setAccesosMcp(datos.accesosMcp);
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [recarga, supabase]);

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

  async function crearToken() {
    setProcesandoToken(true);
    setErrorToken(null);
    const response = await fetch("/api/mcp/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombreToken }),
    });
    const data = await response.json();
    if (!response.ok) {
      setErrorToken(data.error ?? "No pudimos crear el acceso");
    } else {
      setTokenNuevo(data.token);
      setTokensMcp((actuales) => [data.acceso, ...actuales]);
    }
    setProcesandoToken(false);
  }

  async function revocarToken(id: string) {
    const response = await fetch(`/api/mcp/tokens/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setTokensMcp((actuales) =>
      actuales.map((token) =>
        token.id === id ? { ...token, revocado_en: new Date().toISOString() } : token,
      ),
    );
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
        <div>
          <h2 className="label-md text-on-surface-variant">Acceso para asistentes y agentes</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Cada agente recibe una credencial independiente. Puedes revocarla sin desconectar tus
            fuentes ni borrar tu perfil.
          </p>
        </div>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 label-sm text-on-surface-variant">
              Nombre del acceso
              <input
                value={nombreToken}
                onChange={(event) => setNombreToken(event.target.value)}
                maxLength={60}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 body-md text-on-surface outline-none focus:border-primary"
              />
            </label>
            <Button type="button" onClick={crearToken} disabled={procesandoToken}>
              {procesandoToken ? "Creando…" : "Crear acceso MCP"}
            </Button>
          </div>
          {errorToken && <p className="text-sm text-error">{errorToken}</p>}
          {tokenNuevo && (
            <div className="rounded-lg border border-positive/30 bg-positive/5 p-4">
              <p className="font-semibold text-on-surface">Copia esta credencial ahora</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Por seguridad no podremos volver a mostrarla.
              </p>
              <code className="mt-3 block overflow-x-auto rounded bg-surface-container-high px-3 py-2 text-sm text-on-surface">
                {tokenNuevo}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(tokenNuevo)}
                className="mt-3 label-sm text-primary underline"
              >
                Copiar credencial
              </button>
            </div>
          )}
        </Card>

        <Table>
          <Thead>
            <tr>
              <Th>Agente</Th>
              <Th>Credencial</Th>
              <Th>Último uso</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {tokensMcp.map((token) => (
              <Tr key={token.id}>
                <Td>{token.nombre}</Td>
                <Td><code>{token.prefijo}…</code></Td>
                <Td>{token.ultimo_uso ? new Date(token.ultimo_uso).toLocaleString("es-CO") : "Nunca"}</Td>
                <Td className={token.revocado_en ? "text-on-surface-variant" : "text-positive"}>
                  {token.revocado_en ? "Revocado" : "Activo"}
                </Td>
                <Td>
                  {!token.revocado_en && (
                    <button
                      type="button"
                      onClick={() => revocarToken(token.id)}
                      className="label-sm text-error underline"
                    >
                      Revocar
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
            {tokensMcp.length === 0 && (
              <Tr><Td colSpan={5} className="text-on-surface-variant">No has autorizado agentes.</Td></Tr>
            )}
          </tbody>
        </Table>

        {accesosMcp.length > 0 && (
          <div className="mt-2">
            <h3 className="label-sm text-on-surface-variant">Lecturas recientes</h3>
            <ul className="mt-2 divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {accesosMcp.slice(0, 5).map((acceso) => {
                const token = tokensMcp.find((item) => item.id === acceso.token_id);
                return (
                  <li key={acceso.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
                    <span className="body-md text-on-surface">
                      {token?.nombre ?? "Acceso eliminado"} · {acceso.herramienta}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {acceso.exito ? "Consulta completada" : "Consulta fallida"} · {new Date(acceso.creado_en).toLocaleString("es-CO")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
