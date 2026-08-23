"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { titulo: string; detalle: string; prioridad?: string; proximoPaso?: string };
type DatosPortal = {
  perfil: null | { datos: { generadoEn: string; generadoPor: { motor: string; modelo: string }; identidad: { nombre: string } | null; problema: { titulo: string } | null; narrativa: { resumenEjecutivo: string; lecturaObjetivo: string; fortalezas: Item[]; alertas: Item[]; prioridades: Item[] }; perfilBase: { ingresos: { verificado: { valor: number | null } }; flujo: { flujoLibreObservado: { valor: number | null } }; obligaciones: { cargaFinanciera: { valor: number | null } }; patrimonio: { total: { valor: number | null } }; calidadDatos: { completitud: number; confianza: number; datosFaltantes: string[] } } } };
  sesionesPerfil: { id: string; version: string; generadoEn: string }[];
  documentos: { id: string; nombre: string; estado: string; creadoEn: string }[];
  conversaciones: { id: string; titulo: string | null; canal: string; actualizadoEn: string }[];
};

const OPCIONES = [
  ["perfil:identidad", "Identidad", "Nombre y ciudad"], ["perfil:resumen", "Resumen", "Lectura, fortalezas y alertas"],
  ["perfil:ingresos", "Ingresos", "Declarados y observados"], ["perfil:flujo", "Flujo", "Gastos y margen mensual"],
  ["perfil:obligaciones", "Obligaciones", "Deudas, cuotas y carga"], ["perfil:patrimonio", "Patrimonio", "Activos reportados"],
  ["perfil:objetivo", "Objetivo", "Problema que quieres resolver"], ["perfil:acciones", "Próximos pasos", "Prioridades sugeridas"],
  ["perfil:calidad", "Calidad", "Cobertura y datos faltantes"],
] as const;

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(valor));

export default function PortalPage() {
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>(["perfil:resumen", "perfil:objetivo", "perfil:calidad"]);
  const [token, setToken] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => { fetch("/api/portal").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setDatos(d); }).catch((e) => setError(e.message)); }, []);

  async function crearAcceso() {
    setCreando(true); setToken(null);
    try {
      const r = await fetch("/api/mcp/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: "Acceso desde mi portal", scopes }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error); setToken(d.token);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el acceso"); } finally { setCreando(false); }
  }

  async function abrirDocumento(id: string) {
    const r = await fetch(`/api/perfil/documentos/${id}`); const d = await r.json();
    if (r.ok) window.open(d.url, "_blank", "noopener,noreferrer"); else setError(d.error);
  }

  if (!datos && !error) return <main className="min-h-screen bg-surface p-8 text-on-surface"><p>Preparando tu portal…</p></main>;
  const perfil = datos?.perfil?.datos;
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <header className="border-b border-outline-variant bg-secondary px-5 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between"><div><p className="label-md text-primary">PA&apos;LANTE</p><h1 className="headline-md">Tu contexto financiero</h1></div><Link href="/asistente" className="rounded-full bg-primary px-5 py-3 font-semibold text-on-primary">Hablar con el agente</Link></div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1.5fr_1fr]">
        {error && <p className="rounded-xl bg-error-container p-4 text-on-error-container lg:col-span-2">{error}</p>}
        {!perfil ? <section className="rounded-3xl bg-surface-container-lowest p-7 shadow-sm"><h2 className="headline-md">Aún no tienes un perfil</h2><Link href="/intake" className="mt-4 inline-block font-semibold text-on-primary-container underline">Completar el flujo inicial</Link></section> : <>
          <section className="rounded-3xl bg-secondary p-7 text-white shadow-sm">
            <div className="flex flex-wrap justify-between gap-3"><div><p className="label-md text-primary">PERFIL FINANCIERO</p><h2 className="headline-lg mt-2">{perfil.identidad?.nombre ?? "Tu panorama actual"}</h2></div><span className="h-fit rounded-full bg-white/10 px-3 py-2 text-xs">{perfil.generadoPor.motor === "anthropic" ? `IA · ${perfil.generadoPor.modelo}` : "Análisis local"}</span></div>
            <p className="body-lg mt-5 text-white/85">{perfil.narrativa.resumenEjecutivo}</p>
            {perfil.problema && <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4"><p className="text-xs font-semibold text-primary">OBJETIVO ACTIVO</p><p className="mt-1 font-semibold">{perfil.problema.titulo}</p><p className="mt-1 text-sm text-white/70">{perfil.narrativa.lecturaObjetivo}</p></div>}
          </section>
          <section className="rounded-3xl bg-surface-container-lowest p-7 shadow-sm"><div className="flex items-end justify-between"><div><p className="label-md text-on-surface-variant">CALIDAD DEL PERFIL</p><p className="headline-xl mt-2">{perfil.perfilBase.calidadDatos.completitud}%</p></div><span className="text-sm text-on-surface-variant">Confianza {Math.round(perfil.perfilBase.calidadDatos.confianza * 100)}%</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-positive" style={{ width: `${perfil.perfilBase.calidadDatos.completitud}%` }} /></div><p className="mt-4 text-sm text-on-surface-variant">{perfil.perfilBase.calidadDatos.datosFaltantes.length ? `${perfil.perfilBase.calidadDatos.datosFaltantes.length} datos por completar` : "No hay vacíos críticos identificados"}</p></section>
          <section className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">{[["Ingreso observado", perfil.perfilBase.ingresos.verificado.valor, "cop"], ["Flujo libre", perfil.perfilBase.flujo.flujoLibreObservado.valor, "cop"], ["Carga financiera", perfil.perfilBase.obligaciones.cargaFinanciera.valor, "pct"], ["Patrimonio", perfil.perfilBase.patrimonio.total.valor, "cop"]].map(([etiqueta, valor, tipo]) => <div key={String(etiqueta)} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5"><p className="text-sm text-on-surface-variant">{etiqueta}</p><p className="mt-2 text-xl font-bold">{tipo === "pct" ? `${Number(valor ?? 0).toFixed(1)}%` : COP.format(Number(valor ?? 0))}</p></div>)}</section>
          <section className="rounded-3xl bg-surface-container-lowest p-7 shadow-sm"><h2 className="headline-md">Lo más importante</h2><div className="mt-5 space-y-4">{[...perfil.narrativa.fortalezas, ...perfil.narrativa.alertas].map((item, i) => <article key={`${item.titulo}-${i}`} className="border-l-4 border-primary pl-4"><h3 className="font-semibold">{item.titulo}</h3><p className="mt-1 text-sm text-on-surface-variant">{item.detalle}</p></article>)}</div></section>
          <section className="rounded-3xl bg-surface-container-lowest p-7 shadow-sm"><h2 className="headline-md">Próximos pasos</h2><ol className="mt-5 space-y-4">{perfil.narrativa.prioridades.map((item, i) => <li key={`${item.titulo}-${i}`} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">{i + 1}</span><div><h3 className="font-semibold">{item.titulo}</h3><p className="text-sm text-on-surface-variant">{item.proximoPaso}</p></div></li>)}</ol></section>
        </>}

        <section className="rounded-3xl border-2 border-secondary bg-surface-container-lowest p-7 lg:col-span-2"><div className="max-w-3xl"><p className="label-md text-on-primary-container">PRIVACIDAD Y MCP</p><h2 className="headline-md mt-2">Tú decides qué puede leer otra IA</h2><p className="mt-2 text-on-surface-variant">Selecciona únicamente las secciones necesarias. El token se muestra una sola vez y puedes revocarlo cuando quieras.</p></div><div className="mt-6 grid gap-3 md:grid-cols-3">{OPCIONES.map(([id, titulo, detalle]) => <label key={id} className={`cursor-pointer rounded-2xl border p-4 ${scopes.includes(id) ? "border-primary bg-primary-container" : "border-outline-variant"}`}><input type="checkbox" className="mr-3" checked={scopes.includes(id)} onChange={() => setScopes((actual) => actual.includes(id) ? actual.filter((s) => s !== id) : [...actual, id])} /><span className="font-semibold">{titulo}</span><span className="mt-1 block pl-6 text-xs text-on-surface-variant">{detalle}</span></label>)}</div><button type="button" disabled={!scopes.length || creando} onClick={crearAcceso} className="mt-6 rounded-full bg-secondary px-6 py-3 font-semibold text-white disabled:opacity-40">{creando ? "Creando…" : `Crear acceso con ${scopes.length} scopes`}</button>{token && <div className="mt-4 rounded-xl bg-secondary p-4 text-white"><p className="text-xs text-white/60">Cópialo ahora; no volverá a mostrarse.</p><code className="mt-2 block break-all text-sm">{token}</code></div>}</section>

        <section className="rounded-3xl bg-surface-container-lowest p-7"><h2 className="headline-md">Sesiones</h2><div className="mt-5 space-y-3">{datos?.sesionesPerfil.map((s) => <div key={s.id} className="rounded-xl bg-surface-container-low p-4"><p className="font-semibold">Perfil financiero v{s.version}</p><p className="text-xs text-on-surface-variant">{fecha(s.generadoEn)}</p></div>)}{datos?.conversaciones.map((s) => <div key={s.id} className="rounded-xl bg-surface-container-low p-4"><p className="font-semibold">{s.titulo || "Conversación con el agente"}</p><p className="text-xs text-on-surface-variant">{s.canal} · {fecha(s.actualizadoEn)}</p></div>)}</div></section>
        <section className="rounded-3xl bg-surface-container-lowest p-7"><div className="flex items-center justify-between"><h2 className="headline-md">Archivos</h2><Link href="/intake" className="text-sm font-semibold underline">Agregar</Link></div><div className="mt-5 space-y-3">{datos?.documentos.length ? datos.documentos.map((d) => <button type="button" onClick={() => void abrirDocumento(d.id)} key={d.id} className="flex w-full items-center justify-between rounded-xl bg-surface-container-low p-4 text-left"><span className="min-w-0"><span className="block truncate font-semibold">{d.nombre}</span><span className="text-xs text-on-surface-variant">{fecha(d.creadoEn)}</span></span><span className="rounded-full bg-surface-container px-3 py-1 text-xs">{d.estado}</span></button>) : <p className="text-on-surface-variant">No has adjuntado archivos.</p>}</div></section>
      </div>
    </main>
  );
}
