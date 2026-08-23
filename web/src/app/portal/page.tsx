"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Logotipo } from "@/components/shared/Logotipo";
import styles from "./portal.module.css";

type Seccion = "perfil" | "sesiones" | "archivos" | "integraciones";
type Item = { titulo: string; detalle: string; prioridad?: string; proximoPaso?: string };
type Perfil = {
  generadoEn: string;
  generadoPor: { motor: string; modelo: string };
  identidad: { nombre: string; ciudad?: string | null } | null;
  problema: { titulo: string } | null;
  narrativa: {
    resumenEjecutivo: string;
    lecturaObjetivo: string;
    fortalezas: Item[];
    alertas: Item[];
    prioridades: Item[];
  };
  perfilBase: {
    periodo?: { desde?: string; hasta?: string; meses?: number };
    ingresos: { verificado: { valor: number | null }; porcentajeVerificado?: { valor: number | null } };
    flujo: { flujoLibreObservado: { valor: number | null }; gastoMensualObservado?: { valor: number | null } };
    obligaciones: { cargaFinanciera: { valor: number | null }; deudaTotal?: { valor: number | null } };
    patrimonio: { total: { valor: number | null } };
    calidadDatos: { completitud: number; confianza: number; fuentesIndependientes?: number; datosFaltantes: string[] };
  };
};
type DatosPortal = {
  perfil: null | { datos: Perfil };
  sesionesPerfil: { id: string; version: string; generadoEn: string }[];
  documentos: { id: string; nombre: string; tipo: string; estado: string; creadoEn: string }[];
  conversaciones: { id: string; titulo: string | null; canal: string; actualizadoEn: string }[];
};
type Acceso = { id: string; nombre: string; prefijo: string; scopes: string[]; ultimo_uso: string | null; revocado_en: string | null; creado_en: string };
type DatosAcceso = { tokens: Acceso[]; accesos: { id: string; token_id: string; herramienta: string; exito: boolean; creado_en: string }[] };

const OPCIONES = [
  ["perfil:identidad", "Identidad", "Nombre y ciudad"],
  ["perfil:resumen", "Resumen", "Lectura, fortalezas y alertas"],
  ["perfil:ingresos", "Ingresos", "Declarados y observados"],
  ["perfil:flujo", "Flujo", "Gastos y margen mensual"],
  ["perfil:obligaciones", "Obligaciones", "Deudas, cuotas y carga"],
  ["perfil:patrimonio", "Patrimonio", "Activos reportados"],
  ["perfil:objetivo", "Objetivo", "Problema que quieres resolver"],
  ["perfil:acciones", "Acciones", "Prioridades y próximos pasos"],
  ["perfil:calidad", "Calidad", "Cobertura y datos faltantes"],
] as const;

const NAVEGACION: { id: Seccion; etiqueta: string; icono: "perfil" | "sesiones" | "archivos" | "api" }[] = [
  { id: "perfil", etiqueta: "Perfil financiero", icono: "perfil" },
  { id: "sesiones", etiqueta: "Sesiones", icono: "sesiones" },
  { id: "archivos", etiqueta: "Archivos", icono: "archivos" },
  { id: "integraciones", etiqueta: "API & MCP", icono: "api" },
];

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const fecha = (valor: string) => FECHA.format(new Date(valor));

function Icono({ nombre }: { nombre: "perfil" | "sesiones" | "archivos" | "api" }) {
  const paths = {
    perfil: <><path d="M4 19V9M10 19V5M16 19v-7M2 19h16" /><path d="m3 8 5-4 5 4 5-5" /></>,
    sesiones: <><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /><path d="M16 16l3 3" /></>,
    archivos: <><path d="M5 2h7l4 4v12H5z" /><path d="M12 2v5h4M8 11h5M8 14h5" /></>,
    api: <><path d="M7 4 2 10l5 6M13 4l5 6-5 6M11 2 8 18" /></>,
  };
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[nombre]}</svg>;
}

function Encabezado({ etiqueta, titulo, descripcion, accion }: { etiqueta: string; titulo: string; descripcion: string; accion?: ReactNode }) {
  return <header className={styles.pageHeader}><div><p className={styles.eyebrow}>{etiqueta}</p><h1>{titulo}</h1><p className={styles.pageDescription}>{descripcion}</p></div>{accion}</header>;
}

function Estado({ children, tono = "neutral" }: { children: ReactNode; tono?: "neutral" | "ok" | "warn" }) {
  return <span className={`${styles.status} ${styles[`status_${tono}`]}`}><span />{children}</span>;
}

export default function PortalPage() {
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  const [datosAcceso, setDatosAcceso] = useState<DatosAcceso>({ tokens: [], accesos: [] });
  const [seccion, setSeccion] = useState<Seccion>("perfil");
  const [error, setError] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>(["perfil:resumen", "perfil:objetivo", "perfil:calidad"]);
  const [token, setToken] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/portal"), fetch("/api/mcp/tokens")])
      .then(async ([portalRes, accesoRes]) => {
        const [portal, accesos] = await Promise.all([portalRes.json(), accesoRes.json()]);
        if (!portalRes.ok) throw new Error(portal.error);
        if (!accesoRes.ok) throw new Error(accesos.error);
        setDatos(portal);
        setDatosAcceso(accesos);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No pudimos cargar tu portal."));
  }, []);

  async function crearAcceso() {
    setCreando(true);
    setToken(null);
    setError(null);
    try {
      const respuesta = await fetch("/api/mcp/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: `Integración ${datosAcceso.tokens.filter((item) => !item.revocado_en).length + 1}`, scopes }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error);
      setToken(resultado.token);
      setDatosAcceso((actual) => ({ ...actual, tokens: [resultado.acceso, ...actual.tokens] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el acceso.");
    } finally {
      setCreando(false);
    }
  }

  async function revocarAcceso(id: string) {
    const respuesta = await fetch(`/api/mcp/tokens/${id}`, { method: "DELETE" });
    if (!respuesta.ok) return setError("No pudimos revocar ese acceso.");
    setDatosAcceso((actual) => ({ ...actual, tokens: actual.tokens.map((item) => item.id === id ? { ...item, revocado_en: new Date().toISOString() } : item) }));
  }

  async function abrirDocumento(id: string) {
    const respuesta = await fetch(`/api/perfil/documentos/${id}`);
    const resultado = await respuesta.json();
    if (respuesta.ok) window.open(resultado.url, "_blank", "noopener,noreferrer");
    else setError(resultado.error);
  }

  async function copiar(valor: string, id: string) {
    await navigator.clipboard.writeText(valor);
    setCopiado(id);
    window.setTimeout(() => setCopiado(null), 1400);
  }

  const perfil = datos?.perfil?.datos;
  const nombre = perfil?.identidad?.nombre ?? "Mi espacio";
  const iniciales = nombre.split(" ").slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><span className={styles.brandMark}><Logotipo size={20} /></span><span><strong>Pa&apos;lante</strong><small>CONTEXT OS</small></span></div>
        <div className={styles.workspace}><span className={styles.avatar}>{iniciales || "PL"}</span><span><strong>{nombre}</strong><small>Personal workspace</small></span><span className={styles.chevron}>⌄</span></div>
        <nav className={styles.navigation} aria-label="Portal financiero">
          <p>Workspace</p>
          {NAVEGACION.map((item) => <button key={item.id} type="button" onClick={() => setSeccion(item.id)} className={seccion === item.id ? styles.navActive : ""}><Icono nombre={item.icono} /><span>{item.etiqueta}</span>{item.id === "archivos" && datos?.documentos.length ? <em>{datos.documentos.length}</em> : null}</button>)}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.systemState}><span className={styles.liveDot} /><span><strong>Contexto sincronizado</strong><small>{perfil ? `Perfil v1.1 · ${perfil.perfilBase.calidadDatos.completitud}% completo` : "Esperando perfil"}</small></span></div>
          <Link href="/" className={styles.exitLink}>← Volver al inicio</Link>
        </div>
      </aside>

      <section className={styles.workspaceMain}>
        <div className={styles.topbar}><div className={styles.breadcrumb}><span>workspace</span><b>/</b><strong>{seccion === "integraciones" ? "developer" : seccion}</strong></div><div className={styles.topActions}><span className={styles.syncLabel}><i /> Datos privados</span><Link href="/intake/problema" className={styles.secondaryAction}>+ Nueva sesión</Link><Link href="/asistente" className={styles.primaryAction}>Abrir agente <span>↗</span></Link></div></div>

        <div className={styles.content}>
          {error && <div className={styles.errorBanner}><span>!</span><p>{error}</p><button type="button" onClick={() => setError(null)}>×</button></div>}
          {!datos && !error && <div className={styles.loading}><Logotipo size={28} /><p>Cargando workspace…</p></div>}

          {datos && seccion === "perfil" && (
            <VistaPerfil perfil={perfil} />
          )}
          {datos && seccion === "sesiones" && (
            <VistaSesiones datos={datos} />
          )}
          {datos && seccion === "archivos" && (
            <VistaArchivos documentos={datos.documentos} abrirDocumento={abrirDocumento} />
          )}
          {datos && seccion === "integraciones" && (
            <VistaIntegraciones
              scopes={scopes}
              setScopes={setScopes}
              token={token}
              creando={creando}
              crearAcceso={crearAcceso}
              accesos={datosAcceso.tokens}
              revocarAcceso={revocarAcceso}
              copiar={copiar}
              copiado={copiado}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function VistaPerfil({ perfil }: { perfil?: Perfil }) {
  if (!perfil) return <div className={styles.emptyState}><span>01</span><h2>Construye tu primer perfil</h2><p>Completa el flujo inicial para consolidar tu contexto financiero.</p><Link href="/intake" className={styles.primaryAction}>Comenzar ahora →</Link></div>;
  const metricas = [
    { etiqueta: "Ingreso observado", valor: COP.format(perfil.perfilBase.ingresos.verificado.valor ?? 0), meta: `${perfil.perfilBase.ingresos.porcentajeVerificado?.valor ?? 0}% verificado` },
    { etiqueta: "Flujo libre mensual", valor: COP.format(perfil.perfilBase.flujo.flujoLibreObservado.valor ?? 0), meta: `Gasto ${COP.format(perfil.perfilBase.flujo.gastoMensualObservado?.valor ?? 0)}` },
    { etiqueta: "Carga financiera", valor: `${(perfil.perfilBase.obligaciones.cargaFinanciera.valor ?? 0).toFixed(1)}%`, meta: `Deuda ${COP.format(perfil.perfilBase.obligaciones.deudaTotal?.valor ?? 0)}` },
    { etiqueta: "Patrimonio reportado", valor: COP.format(perfil.perfilBase.patrimonio.total.valor ?? 0), meta: "Activos conocidos" },
  ];
  return <>
    <Encabezado etiqueta="FINANCIAL PROFILE / V1.1" titulo="Tu perfil financiero" descripcion={`Última compilación ${fecha(perfil.generadoEn)} · ${perfil.generadoPor.motor === "anthropic" ? perfil.generadoPor.modelo : "motor local"}`} accion={<Estado tono="ok">Perfil activo</Estado>} />
    <section className={styles.profileHero}>
      <div className={styles.heroCopy}><div className={styles.heroLabel}><span>AI SUMMARY</span><i /> Basado en evidencia disponible</div><h2>{perfil.problema?.titulo ?? "Panorama financiero general"}</h2><p>{perfil.narrativa.resumenEjecutivo}</p>{perfil.problema && <div className={styles.objectiveLine}><span>Objetivo</span><p>{perfil.narrativa.lecturaObjetivo}</p></div>}</div>
      <div className={styles.qualityPanel}><div className={styles.qualityTop}><span>PROFILE QUALITY</span><strong>{perfil.perfilBase.calidadDatos.completitud}<small>%</small></strong></div><div className={styles.qualityTrack}><i style={{ width: `${perfil.perfilBase.calidadDatos.completitud}%` }} /></div><dl><div><dt>Confianza</dt><dd>{Math.round(perfil.perfilBase.calidadDatos.confianza * 100)}%</dd></div><div><dt>Fuentes</dt><dd>{perfil.perfilBase.calidadDatos.fuentesIndependientes ?? 0}</dd></div><div><dt>Vacíos</dt><dd>{perfil.perfilBase.calidadDatos.datosFaltantes.length}</dd></div></dl></div>
    </section>
    <section className={styles.metrics}>{metricas.map((metrica, indice) => <article key={metrica.etiqueta}><span className={styles.metricIndex}>0{indice + 1}</span><p>{metrica.etiqueta}</p><strong>{metrica.valor}</strong><small>{metrica.meta}</small></article>)}</section>
    <div className={styles.profileGrid}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span>INSIGHTS</span><h3>Señales del perfil</h3></div><span className={styles.count}>{perfil.narrativa.fortalezas.length + perfil.narrativa.alertas.length}</span></div><div className={styles.insightList}>{perfil.narrativa.fortalezas.map((item) => <article key={item.titulo}><span className={styles.signalPositive}>↑</span><div><h4>{item.titulo}</h4><p>{item.detalle}</p></div><Estado tono="ok">Fortaleza</Estado></article>)}{perfil.narrativa.alertas.map((item) => <article key={item.titulo}><span className={styles.signalWarning}>!</span><div><h4>{item.titulo}</h4><p>{item.detalle}</p></div><Estado tono="warn">Revisar</Estado></article>)}</div></section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span>NEXT ACTIONS</span><h3>Próximos pasos</h3></div><span className={styles.count}>{perfil.narrativa.prioridades.length}</span></div><ol className={styles.actionList}>{perfil.narrativa.prioridades.map((item, indice) => <li key={item.titulo}><span>0{indice + 1}</span><div><h4>{item.titulo}</h4><p>{item.proximoPaso}</p></div></li>)}</ol></section>
    </div>
  </>;
}

function VistaSesiones({ datos }: { datos: DatosPortal }) {
  const total = datos.sesionesPerfil.length + datos.conversaciones.length;
  return <><Encabezado etiqueta="ACTIVITY LOG" titulo="Sesiones" descripcion="Historial de perfiles generados y conversaciones guardadas en tu contexto." accion={<Link href="/intake/problema" className={styles.primaryAction}>+ Iniciar sesión</Link>} /><section className={styles.tablePanel}><div className={styles.tableToolbar}><div><strong>{total} registros</strong><span>Ordenados por actividad reciente</span></div><Estado tono="ok">Persistencia activa</Estado></div><div className={styles.dataTable}><div className={styles.tableHead}><span>Tipo</span><span>Nombre</span><span>Estado</span><span>Actualización</span><span>ID</span></div>{datos.sesionesPerfil.map((item) => <div className={styles.tableRow} key={item.id}><span><i className={styles.typeIcon}>PF</i></span><strong>Perfil financiero v{item.version}</strong><Estado tono="ok">Generado</Estado><span>{fecha(item.generadoEn)}</span><code>{item.id.slice(0, 8)}</code></div>)}{datos.conversaciones.map((item) => <div className={styles.tableRow} key={item.id}><span><i className={styles.typeIcon}>AI</i></span><strong>{item.titulo || "Conversación con el agente"}</strong><Estado>Guardada</Estado><span>{fecha(item.actualizadoEn)}</span><code>{item.id.slice(0, 8)}</code></div>)}</div></section></>;
}

function VistaArchivos({ documentos, abrirDocumento }: { documentos: DatosPortal["documentos"]; abrirDocumento: (id: string) => Promise<void> }) {
  return <><Encabezado etiqueta="CONTEXT STORAGE" titulo="Archivos" descripcion="Documentos privados vinculados a tu contexto. Cada apertura usa una URL temporal." accion={<Link href="/intake" className={styles.primaryAction}>+ Agregar archivo</Link>} /><section className={styles.storageSummary}><div><span>Objetos almacenados</span><strong>{documentos.length}</strong></div><div><span>Acceso</span><strong>Privado</strong></div><div><span>Entrega</span><strong>Signed URL</strong></div><div><span>Retención</span><strong>Bajo tu control</strong></div></section><section className={styles.tablePanel}><div className={styles.tableToolbar}><div><strong>Storage / documentos</strong><span>Selecciona un archivo para abrirlo de forma segura</span></div><code>bucket:private</code></div>{documentos.length ? <div className={styles.dataTable}><div className={`${styles.tableHead} ${styles.fileColumns}`}><span>Archivo</span><span>Tipo</span><span>Extracción</span><span>Creado</span><span /></div>{documentos.map((item) => <button type="button" onClick={() => void abrirDocumento(item.id)} className={`${styles.tableRow} ${styles.fileColumns}`} key={item.id}><strong className={styles.fileName}><i>⌑</i>{item.nombre}</strong><code>{item.tipo}</code><Estado tono={item.estado === "completado" ? "ok" : "neutral"}>{item.estado}</Estado><span>{fecha(item.creadoEn)}</span><span className={styles.openArrow}>↗</span></button>)}</div> : <div className={styles.inlineEmpty}><p>No hay objetos en este bucket.</p><Link href="/intake">Subir el primero →</Link></div>}</section></>;
}

function VistaIntegraciones({ scopes, setScopes, token, creando, crearAcceso, accesos, revocarAcceso, copiar, copiado }: { scopes: string[]; setScopes: (scopes: string[]) => void; token: string | null; creando: boolean; crearAcceso: () => Promise<void>; accesos: Acceso[]; revocarAcceso: (id: string) => Promise<void>; copiar: (valor: string, id: string) => Promise<void>; copiado: string | null }) {
  const endpoint = "https://pa-lante-mcp.vercel.app/mcp";
  const activos = accesos.filter((item) => !item.revocado_en);
  return <><Encabezado etiqueta="DEVELOPER PLATFORM" titulo="API & MCP" descripcion="Expón únicamente el contexto que necesitas. Cada token tiene permisos independientes y auditables." accion={<Estado tono="ok">MCP online</Estado>} />
    <section className={styles.devIntro}><div><span className={styles.codePrompt}>$</span><div><p>Conecta tu contexto financiero a Claude, Cursor o cualquier cliente MCP.</p><code>{endpoint}</code></div></div><button type="button" onClick={() => void copiar(endpoint, "endpoint")}>{copiado === "endpoint" ? "Copiado ✓" : "Copiar endpoint"}</button></section>
    <div className={styles.developerGrid}><section className={styles.scopePanel}><div className={styles.panelHeader}><div><span>PERMISSION SET</span><h3>Scopes del nuevo token</h3></div><span className={styles.count}>{scopes.length}/9</span></div><p className={styles.helperText}>La herramienta MCP solo registra y devuelve las secciones seleccionadas.</p><div className={styles.scopeList}>{OPCIONES.map(([id, titulo, detalle]) => { const activo = scopes.includes(id); return <label key={id} className={activo ? styles.scopeActive : ""}><input type="checkbox" checked={activo} onChange={() => setScopes(activo ? scopes.filter((scope) => scope !== id) : [...scopes, id])} /><span className={styles.customCheck}>{activo ? "✓" : ""}</span><span><strong>{titulo}</strong><small>{detalle}</small></span><code>{id}</code></label>; })}</div><div className={styles.scopeFooter}><p><strong>Principio de mínimo privilegio</strong><span>Empieza con lo mínimo. Puedes crear otro token después.</span></p><button type="button" disabled={!scopes.length || creando} onClick={() => void crearAcceso()}>{creando ? "Generando…" : "Generar token"}</button></div>{token && <div className={styles.tokenReveal}><div><span>NEW SECRET · SOLO SE MUESTRA UNA VEZ</span><code>{token}</code></div><button type="button" onClick={() => void copiar(token, "token")}>{copiado === "token" ? "Copiado ✓" : "Copiar"}</button></div>}</section>
      <aside className={styles.integrationAside}><section className={styles.endpointCard}><div className={styles.panelHeader}><div><span>QUICK START</span><h3>Configurar cliente</h3></div></div><pre>{`{\n  "mcpServers": {\n    "palante": {\n      "url": "${endpoint}",\n      "headers": {\n        "Authorization": "Bearer <token>"\n      }\n    }\n  }\n}`}</pre><p>Transport <code>streamable-http</code></p></section><section className={styles.tokensCard}><div className={styles.panelHeader}><div><span>ACTIVE KEYS</span><h3>Tokens</h3></div><span className={styles.count}>{activos.length}</span></div><div className={styles.tokenList}>{activos.length ? activos.map((item) => <article key={item.id}><div><span><i />{item.nombre}</span><code>{item.prefijo}••••••••</code><small>{item.ultimo_uso ? `Último uso ${fecha(item.ultimo_uso)}` : "Sin uso todavía"} · {item.scopes.length} scopes</small></div><button type="button" onClick={() => void revocarAcceso(item.id)}>Revocar</button></article>) : <p className={styles.noTokens}>No hay tokens activos.</p>}</div></section></aside>
    </div>
  </>;
}
