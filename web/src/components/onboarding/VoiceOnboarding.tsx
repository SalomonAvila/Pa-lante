"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation, useConversationClientTool } from "@elevenlabs/react";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import { BackHomeButton } from "@/components/shared/BackHomeButton";
import { AvatarUsuario } from "@/components/auth/AvatarUsuario";
import { Button } from "@/components/ui/Button";
import { ReactiveVoiceCircle } from "./ReactiveVoiceCircle";
import type { Completitud } from "@/lib/perfil/completitud";
import type { TipoHallazgo } from "@/types/finance";
import type { ConexionFuente } from "@/lib/conectores/tipos";
import { ConectarGmailButton } from "@/components/auth/ConectarGmailButton";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

/** Cuánto necesitamos saber antes de dar por terminada la conversación. */
const UMBRAL_COMPLETITUD = 80;

/**
 * Voces disponibles para el agente — el agente en ElevenLabs tiene habilitado
 * el override de tts.voice_id por sesión (platform_settings.overrides), así
 * que esto no cambia la personalidad/prompt, solo con qué voz habla.
 */
const VOCES = [
  { id: "wKvrrFnAmhvpNRpZkbmh", nombre: "Diana", descripcion: "Colombiana, cálida" },
  { id: "xzUwWse1B1nyc4pXhaLG", nombre: "Andrés", descripcion: "Argentino, calmado" },
  { id: "RjnDg9S3IUlYzp0QIp3R", nombre: "Johana", descripcion: "Latina, calmada" },
  { id: "zsjfif2v09thEBtkBYFe", nombre: "Yeiden", descripcion: "Latino, cálido" },
] as const;

async function consultarCompletitud(): Promise<Completitud> {
  const res = await fetch("/api/perfil/completitud");
  if (!res.ok) return { porcentaje: 0, camposFaltantes: [] };
  return res.json();
}

type ContactoBasico = {
  nombres: string;
  apellidos: string;
  tipo_documento: string | null;
  numero_documento: string | null;
  celular: string;
  ciudad: string | null;
};

const TIPOS_DOCUMENTO = ["CC", "CE", "TI", "PA", "NIT"] as const;

/**
 * Qué quiere lograr el usuario con sus finanzas — deliberadamente distinto
 * de `ObjetivoAccesoFinanciero`/`planes.tipo_meta` (que sigue fijo a
 * "demostrar_capacidad_arriendo" para la lógica de PruebaCapacidadPago):
 * esto es la elección general del usuario, no una vista de divulgación.
 */
const OBJETIVOS = [
  { id: "salir_de_deudas", titulo: "Salir de deudas", descripcion: "Organizar y pagar lo que debo." },
  { id: "organizar_finanzas", titulo: "Organizar mis finanzas", descripcion: "Entender en qué se me va la plata." },
  { id: "meta_ahorro", titulo: "Cumplir una meta de ahorro", descripcion: "Estoy ahorrando para algo puntual." },
  {
    id: "demostrar_capacidad_arriendo",
    titulo: "Demostrar capacidad de pago",
    descripcion: "Necesito respaldo para arrendar.",
  },
] as const;

type ArchivoAdjunto = { id: string; nombre: string };

type HallazgoResumen = {
  id: string;
  tipo: string;
  fuente: string;
  procedencia: string;
  periodo: string | null;
  datos: Record<string, unknown>;
};

type DocumentoResumen = { id: string; nombre: string; estado: string; creadoEn: string };

const ESTADOS_TERMINALES_UI = ["completed", "completed_no_data", "failed", "temporarily_unavailable"];

type ResumenFases = {
  contacto: ContactoBasico | null;
  hallazgosPorVoz: HallazgoResumen[];
  documentos: DocumentoResumen[];
  completitud: Completitud;
};

function OnboardingInner() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completitud, setCompletitud] = useState<Completitud | null>(null);
  const [vozId, setVozId] = useState<string>(VOCES[0].id);

  // /intake ya requiere sesión (proxy.ts). Este dato queda asociado al
  // usuario (contacto_basico.user_id, RLS por dueño) — si ya lo había
  // llenado antes, se le muestra para que elija editar o seguir, en vez de
  // saltárselo en silencio. No es el KYC completo de `personas` (sin fecha
  // de nacimiento, dirección exacta) — eso se pide más adelante cuando haga
  // falta para una integración concreta.
  const [faseContacto, setFaseContacto] = useState<"cargando" | "revisar" | "formulario" | "listo">("cargando");
  const [contacto, setContacto] = useState<ContactoBasico | null>(null);
  const [formNombres, setFormNombres] = useState("");
  const [formApellidos, setFormApellidos] = useState("");
  const [formTipoDocumento, setFormTipoDocumento] = useState<string>(TIPOS_DOCUMENTO[0]);
  const [formNumeroDocumento, setFormNumeroDocumento] = useState("");
  const [formCelular, setFormCelular] = useState("");
  const [formCiudad, setFormCiudad] = useState("");
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [errorContacto, setErrorContacto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/perfil/contacto")
      .then((res) => (res.ok ? res.json() : { contacto: null }))
      .then((data: { contacto: ContactoBasico | null }) => {
        if (data.contacto) {
          setContacto(data.contacto);
          setFaseContacto("revisar");
        } else {
          setFaseContacto("formulario");
        }
      })
      .catch(() => setFaseContacto("formulario"));
  }, []);

  function abrirFormularioContacto() {
    setFormNombres(contacto?.nombres ?? "");
    setFormApellidos(contacto?.apellidos ?? "");
    setFormTipoDocumento(contacto?.tipo_documento ?? TIPOS_DOCUMENTO[0]);
    setFormNumeroDocumento(contacto?.numero_documento ?? "");
    setFormCelular(contacto?.celular ?? "");
    setFormCiudad(contacto?.ciudad ?? "");
    setErrorContacto(null);
    setFaseContacto("formulario");
  }

  async function guardarContacto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formNombres.trim() || !formApellidos.trim() || !formNumeroDocumento.trim() || !formCelular.trim()) return;
    setGuardandoContacto(true);
    setErrorContacto(null);
    try {
      const nuevo: ContactoBasico = {
        nombres: formNombres.trim(),
        apellidos: formApellidos.trim(),
        tipo_documento: formTipoDocumento,
        numero_documento: formNumeroDocumento.trim(),
        celular: formCelular.trim(),
        ciudad: formCiudad.trim() || null,
      };
      const res = await fetch("/api/perfil/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: nuevo.nombres,
          apellidos: nuevo.apellidos,
          tipoDocumento: nuevo.tipo_documento,
          numeroDocumento: nuevo.numero_documento,
          celular: nuevo.celular,
          ciudad: nuevo.ciudad ?? "",
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar");
      setContacto(nuevo);
      setFaseContacto("listo");
    } catch {
      setErrorContacto("No pudimos guardar tus datos. Intenta de nuevo.");
    } finally {
      setGuardandoContacto(false);
    }
  }

  // Selección del problema: entre datos personales y la conversación por
  // voz. Se guarda una sola vez (objetivo_declarado, PK por user_id); si ya
  // lo había elegido antes, se salta directo.
  const [faseObjetivo, setFaseObjetivo] = useState<"cargando" | "elegir" | "listo">("cargando");
  const [objetivo, setObjetivo] = useState<string | null>(null);
  const [guardandoObjetivo, setGuardandoObjetivo] = useState(false);
  const [errorObjetivo, setErrorObjetivo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/perfil/objetivo")
      .then((res) => (res.ok ? res.json() : { problema: null }))
      .then((data: { problema: string | null }) => {
        setObjetivo(data.problema);
        setFaseObjetivo(data.problema ? "listo" : "elegir");
      })
      .catch(() => setFaseObjetivo("elegir"));
  }, []);

  async function elegirObjetivo(problema: string) {
    setGuardandoObjetivo(true);
    setErrorObjetivo(null);
    try {
      const res = await fetch("/api/perfil/objetivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problema }),
      });
      if (!res.ok) throw new Error();
      setObjetivo(problema);
      setFaseObjetivo("listo");
    } catch {
      setErrorObjetivo("No pudimos guardar tu elección. Intenta de nuevo.");
    } finally {
      setGuardandoObjetivo(false);
    }
  }

  // Después de terminar la conversación: adjuntar archivos (sin analizarlos
  // todavía) → conectar fuentes externas → revisar el resumen de todo →
  // generar y guardar el perfil. null mientras se sigue hablando o en reposo.
  const [pasoPostVoz, setPasoPostVoz] = useState<"archivos" | "integraciones" | "resumen" | null>(null);
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>([]);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [resumenFases, setResumenFases] = useState<ResumenFases | null>(null);
  const [generandoPerfil, setGenerandoPerfil] = useState(false);
  const [errorGenerar, setErrorGenerar] = useState<string | null>(null);

  // Integraciones: simuladas (ver conectores/orquestador.ts) — avanzan solas
  // por tiempo transcurrido, así que mientras haya alguna no-terminal se
  // sigue consultando el estado.
  const [conexiones, setConexiones] = useState<ConexionFuente[]>([]);
  const [cargandoConexiones, setCargandoConexiones] = useState(false);
  const [errorConexiones, setErrorConexiones] = useState<string | null>(null);

  useEffect(() => {
    if (pasoPostVoz !== "integraciones") return;
    let activo = true;
    let temporizador: ReturnType<typeof setTimeout>;

    async function consultar() {
      try {
        const res = await fetch("/api/perfil/conexiones/estado");
        if (!res.ok) throw new Error();
        const data: { conexiones: ConexionFuente[] } = await res.json();
        if (!activo) return;
        setConexiones(data.conexiones);
        const hayActivas = data.conexiones.some((c) => !ESTADOS_TERMINALES_UI.includes(c.estado));
        if (hayActivas) temporizador = setTimeout(consultar, 2500);
      } catch {
        if (activo) setErrorConexiones("No pudimos consultar tus conexiones.");
      }
    }

    consultar();
    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [pasoPostVoz]);

  async function conectarFuentes() {
    setCargandoConexiones(true);
    setErrorConexiones(null);
    try {
      const res = await fetch("/api/perfil/conexiones/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const data: { conexiones: ConexionFuente[] } = await res.json();
      setConexiones(data.conexiones);
    } catch {
      setErrorConexiones("No pudimos iniciar la conexión con tus fuentes.");
    } finally {
      setCargandoConexiones(false);
    }
  }

  async function reintentarFuente(id: string) {
    try {
      const res = await fetch(`/api/perfil/conexiones/${id}/reintentar`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data: { conexion: ConexionFuente } = await res.json();
      setConexiones((prev) => prev.map((c) => (c.id === data.conexion.id ? data.conexion : c)));
    } catch {
      setErrorConexiones("No pudimos reintentar esa fuente.");
    }
  }

  useEffect(() => {
    if (pasoPostVoz !== "resumen" || resumenFases) return;
    fetch("/api/perfil/resumen-fases")
      .then((res) => res.json())
      .then(setResumenFases)
      .catch(() => setErrorGenerar("No pudimos cargar tu resumen. Intenta de nuevo."));
  }, [pasoPostVoz, resumenFases]);

  async function subirArchivo(archivo: File) {
    setSubiendoArchivo(true);
    setErrorArchivo(null);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      const res = await fetch("/api/perfil/documentos/adjuntar", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setArchivos((prev) => [...prev, { id: data.id, nombre: data.nombre }]);
    } catch {
      setErrorArchivo(`No pudimos subir "${archivo.name}". Intenta de nuevo.`);
    } finally {
      setSubiendoArchivo(false);
    }
  }

  function seleccionarArchivos(event: ChangeEvent<HTMLInputElement>) {
    const seleccionados = event.target.files;
    if (!seleccionados) return;
    Array.from(seleccionados).forEach((archivo) => void subirArchivo(archivo));
    event.target.value = "";
  }

  async function confirmarYGenerarPerfil() {
    setGenerandoPerfil(true);
    setErrorGenerar(null);
    try {
      const res = await fetch("/api/perfil/generar", { method: "POST" });
      if (!res.ok) throw new Error();
      router.push("/intake/progreso");
    } catch {
      setErrorGenerar("No pudimos generar tu perfil. Intenta de nuevo.");
      setGenerandoPerfil(false);
    }
  }

  const conversation = useConversation({
    onError: (message) => setError(message),
  });

  // El agente llama esto por cada dato que extrae de la respuesta del
  // usuario — se guarda de inmediato, no al terminar la conversación.
  useConversationClientTool("guardar_hallazgo", async (params) => {
    const { tipo, datos, periodo } = params as {
      tipo: TipoHallazgo;
      datos: Record<string, unknown>;
      periodo?: string;
    };
    await fetch("/api/perfil/conversacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, datos, periodo }),
    });
    const nueva = await consultarCompletitud();
    setCompletitud(nueva);
    return JSON.stringify(nueva);
  });

  // El agente lo llama después de guardar un dato, para decidir la siguiente
  // pregunta con el % y los campos que aún faltan — no hay guion fijo, cada
  // pregunta se decide con esto en la mano.
  useConversationClientTool("consultar_completitud", async () => {
    const nueva = await consultarCompletitud();
    setCompletitud(nueva);
    return JSON.stringify(nueva);
  });

  const conectado = conversation.status === "connected";
  const conectando = conversation.status === "connecting";

  const empezarConVoz = useCallback(async () => {
    if (!AGENT_ID) {
      setError("Falta configurar el agente de voz.");
      return;
    }
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const inicial = await consultarCompletitud();
      setCompletitud(inicial);
      await conversation.startSession({
        agentId: AGENT_ID,
        overrides: { tts: { voiceId: vozId } },
        dynamicVariables: {
          porcentaje_completado: inicial.porcentaje,
          campos_faltantes: inicial.camposFaltantes.join(", ") || "ninguno todavía",
          objetivo_declarado: objetivo ?? "sin especificar",
        },
      });
    } catch {
      setError("No pudimos acceder al micrófono. Puedes escribir en su lugar.");
    }
  }, [conversation, vozId, objetivo]);

  const empezarConTexto = useCallback(async () => {
    if (!AGENT_ID) {
      setError("Falta configurar el agente de voz.");
      return;
    }
    setError(null);
    try {
      const inicial = await consultarCompletitud();
      setCompletitud(inicial);
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "websocket",
        overrides: { tts: { voiceId: vozId } },
        dynamicVariables: {
          porcentaje_completado: inicial.porcentaje,
          campos_faltantes: inicial.camposFaltantes.join(", ") || "ninguno todavía",
          objetivo_declarado: objetivo ?? "sin especificar",
        },
      });
      setMostrarTexto(true);
    } catch {
      setError("No pudimos iniciar la conversación. Intenta de nuevo.");
    }
  }, [conversation, vozId, objetivo]);

  function enviarTexto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valor = texto.trim();
    if (!valor) return;
    conversation.sendUserMessage(valor);
    setTexto("");
  }

  // Apenas se da por completa la conversación: adjuntar archivos → revisar
  // resumen → generar perfil (ver pasoPostVoz). Recién ahí se navega a
  // /intake/progreso, dentro de confirmarYGenerarPerfil.
  async function terminarYVerPerfil() {
    await conversation.endSession();
    setPasoPostVoz("archivos");
  }

  const suficiente = (completitud?.porcentaje ?? 0) >= UMBRAL_COMPLETITUD;

  // --- Cargando: todavía no sabemos si ya dio sus datos de contacto.
  if (faseContacto === "cargando") {
    return (
      <div className="relative flex min-h-screen flex-1 items-center justify-center px-6 py-16 text-white">
        <VideoBackdrop />
      </div>
    );
  }

  // --- Revisar: ya había llenado sus datos antes — se le muestran, no se
  // salta en silencio. Puede editarlos o seguir directo.
  if (faseContacto === "revisar" && contacto) {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
        <VideoBackdrop />
        <BackHomeButton theme="dark" />
        <AvatarUsuario theme="dark" flotante />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
          <div>
            <h1 className="headline-md">Ya tenemos tus datos</h1>
            <p className="mt-2 body-md text-white/70">Los que diste la última vez.</p>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/15 bg-black/40 p-5 text-left backdrop-blur-md">
            <p className="body-md">
              {contacto.nombres} {contacto.apellidos}
            </p>
            {contacto.tipo_documento && contacto.numero_documento && (
              <p className="text-sm text-white/60">
                {contacto.tipo_documento} {contacto.numero_documento}
              </p>
            )}
            <p className="text-sm text-white/60">{contacto.celular}</p>
            {contacto.ciudad && <p className="text-sm text-white/60">{contacto.ciudad}</p>}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={abrirFormularioContacto} className="flex-1">
              Editar
            </Button>
            <Button type="button" onClick={() => setFaseContacto("listo")} className="flex-1">
              Continuar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Formulario: primera vez, o editando lo que ya había. Lo mínimo para
  // identificar/contactar al usuario, no el KYC completo — eso se pide más
  // adelante cuando haga falta para una integración concreta.
  if (faseContacto === "formulario") {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
        <VideoBackdrop />
        <BackHomeButton theme="dark" />
        <AvatarUsuario theme="dark" flotante />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-white/15 bg-black/40 p-6 text-center backdrop-blur-xl">
          <div>
            <h1 className="headline-md">{contacto ? "Editar tus datos" : "Antes de empezar"}</h1>
            <p className="mt-2 body-md text-white/70">
              Lo básico para contactarte y, más adelante, identificarte al conectar tus fuentes (DIAN, DataCrédito).
            </p>
          </div>

          <form onSubmit={guardarContacto} className="flex w-full flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={formNombres}
                onChange={(e) => setFormNombres(e.target.value)}
                placeholder="Nombres"
                required
                className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-2.5 body-md text-white outline-none backdrop-blur-md focus:border-2 focus:border-white"
              />
              <input
                value={formApellidos}
                onChange={(e) => setFormApellidos(e.target.value)}
                placeholder="Apellidos"
                required
                className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-2.5 body-md text-white outline-none backdrop-blur-md focus:border-2 focus:border-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={formTipoDocumento}
                onChange={(e) => setFormTipoDocumento(e.target.value)}
                className="rounded-full border border-white/20 bg-black/40 px-4 py-2.5 body-md text-white outline-none backdrop-blur-md focus:border-2 focus:border-white"
              >
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo} value={tipo} className="bg-black text-white">
                    {tipo}
                  </option>
                ))}
              </select>
              <input
                value={formNumeroDocumento}
                onChange={(e) => setFormNumeroDocumento(e.target.value)}
                placeholder="Número de documento"
                required
                className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-2.5 body-md text-white outline-none backdrop-blur-md focus:border-2 focus:border-white"
              />
            </div>
            <input
              value={formCelular}
              onChange={(e) => setFormCelular(e.target.value)}
              placeholder="Celular"
              type="tel"
              required
              className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-2.5 body-md text-white outline-none backdrop-blur-md focus:border-2 focus:border-white"
            />
            <input
              value={formCiudad}
              onChange={(e) => setFormCiudad(e.target.value)}
              placeholder="Ciudad (opcional)"
              className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-2.5 body-md text-white outline-none backdrop-blur-md focus:border-2 focus:border-white"
            />
            {errorContacto && (
              <p className="body-md text-error" role="alert">
                {errorContacto}
              </p>
            )}
            <Button type="submit" disabled={guardandoContacto} className="mt-2">
              {guardandoContacto ? "Guardando…" : "Continuar"}
            </Button>
            {contacto && (
              <button
                type="button"
                onClick={() => setFaseContacto("revisar")}
                className="label-md text-white/50 underline"
              >
                Cancelar
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // --- Selección del problema: qué quiere lograr con sus finanzas. Va entre
  // datos personales y la conversación por voz.
  if (faseContacto === "listo" && faseObjetivo === "cargando") {
    return (
      <div className="relative flex min-h-screen flex-1 items-center justify-center px-6 py-16 text-white">
        <VideoBackdrop />
      </div>
    );
  }

  if (faseContacto === "listo" && faseObjetivo === "elegir") {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
        <VideoBackdrop />
        <BackHomeButton theme="dark" />
        <AvatarUsuario theme="dark" flotante />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-white/15 bg-black/40 p-6 text-center backdrop-blur-xl">
          <div>
            <h1 className="headline-md">¿Qué quieres lograr con tus finanzas?</h1>
            <p className="mt-2 body-md text-white/70">Esto nos ayuda a guiar la conversación.</p>
          </div>

          <div className="flex w-full flex-col gap-2">
            {OBJETIVOS.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => elegirObjetivo(op.id)}
                disabled={guardandoObjetivo}
                className="w-full rounded-2xl border border-white/20 bg-black/30 p-4 text-left transition-colors hover:border-white/50 hover:bg-black/50 disabled:opacity-60"
              >
                <p className="body-md">{op.titulo}</p>
                <p className="mt-1 text-sm text-white/60">{op.descripcion}</p>
              </button>
            ))}
          </div>

          {errorObjetivo && (
            <p className="body-md text-error" role="alert">
              {errorObjetivo}
            </p>
          )}
        </div>
      </div>
    );
  }

  // --- Archivos: cualquier formato, solo se adjuntan — a propósito no se
  // analizan todavía (eso pasa recién al generar el perfil, y ni siquiera
  // ahí: hoy no hay extractor real, ver conversación sobre integraciones).
  if (pasoPostVoz === "archivos") {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
        <VideoBackdrop />
        <BackHomeButton theme="dark" />
        <AvatarUsuario theme="dark" flotante />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-white/15 bg-black/40 p-6 text-center backdrop-blur-xl">
          <div>
            <h1 className="headline-md">¿Algo más para respaldar tu perfil?</h1>
            <p className="mt-2 body-md text-white/70">
              Extractos, capturas, lo que tengas — cualquier formato. Los guardamos, no los analizamos todavía.
            </p>
          </div>

          <label className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/30 px-4 py-8 text-sm text-white/70 transition-colors hover:border-white/60 hover:text-white">
            {subiendoArchivo ? "Subiendo…" : "Toca para elegir archivos"}
            <input type="file" multiple onChange={seleccionarArchivos} disabled={subiendoArchivo} className="hidden" />
          </label>

          {errorArchivo && (
            <p className="body-md text-error" role="alert">
              {errorArchivo}
            </p>
          )}

          {archivos.length > 0 && (
            <ul className="flex w-full flex-col gap-1 text-left">
              {archivos.map((archivo) => (
                <li key={archivo.id} className="truncate rounded-lg bg-white/10 px-3 py-1.5 text-sm">
                  {archivo.nombre}
                </li>
              ))}
            </ul>
          )}

          <Button type="button" onClick={() => setPasoPostVoz("integraciones")} className="mt-2 w-full">
            {archivos.length > 0 ? "Continuar" : "No tengo archivos — continuar"}
          </Button>
        </div>
      </div>
    );
  }

  // --- Integraciones: fuentes externas simuladas (ver conectores/) + Gmail
  // real. No bloquea el flujo — el usuario puede seguir sin conectar nada.
  if (pasoPostVoz === "integraciones") {
    const hayActivas = conexiones.some((c) => !ESTADOS_TERMINALES_UI.includes(c.estado));
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
        <VideoBackdrop />
        <BackHomeButton theme="dark" />
        <AvatarUsuario theme="dark" flotante />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-white/15 bg-black/40 p-6 text-center backdrop-blur-xl">
          <div>
            <h1 className="headline-md">Conecta tus fuentes</h1>
            <p className="mt-2 body-md text-white/70">
              DataCrédito, DIAN, Colpensiones y más — mientras más conectes, más completo será tu perfil. Es
              opcional.
            </p>
          </div>

          {conexiones.length === 0 ? (
            <Button type="button" onClick={conectarFuentes} disabled={cargandoConexiones} className="w-full">
              {cargandoConexiones ? "Conectando…" : "Conectar mis fuentes"}
            </Button>
          ) : (
            <ul className="flex w-full flex-col gap-2 text-left">
              {conexiones.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{c.fuenteId}</p>
                    {c.mensaje && <p className="truncate text-xs text-white/50">{c.mensaje}</p>}
                  </div>
                  {c.estado === "failed" || c.estado === "temporarily_unavailable" ? (
                    <button
                      type="button"
                      onClick={() => reintentarFuente(c.id)}
                      className="shrink-0 text-xs text-white/60 underline"
                    >
                      Reintentar
                    </button>
                  ) : (
                    <span className="shrink-0 text-xs text-white/50">
                      {ESTADOS_TERMINALES_UI.includes(c.estado) ? "Listo" : "En proceso…"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {errorConexiones && (
            <p className="body-md text-error" role="alert">
              {errorConexiones}
            </p>
          )}

          <ConectarGmailButton />

          <Button
            type="button"
            variant="secondary"
            onClick={() => setPasoPostVoz("resumen")}
            className="w-full"
          >
            {hayActivas ? "Continuar sin esperar" : "Continuar"}
          </Button>
        </div>
      </div>
    );
  }

  // --- Resumen general: qué se capturó en cada fase, antes de generar y
  // guardar el perfil financiero completo.
  if (pasoPostVoz === "resumen") {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center gap-8 px-6 py-16 text-white">
        <VideoBackdrop />
        <BackHomeButton theme="dark" />
        <AvatarUsuario theme="dark" flotante />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="headline-md">Revisa antes de generar tu perfil</h1>
            <p className="mt-2 body-md text-white/70">Esto es lo que tenemos de las 3 fases.</p>
          </div>

          {!resumenFases ? (
            <p className="body-md text-white/60">Cargando…</p>
          ) : (
            <div className="flex w-full flex-col gap-4">
              <div className="rounded-2xl border border-white/15 bg-black/40 p-5 text-left backdrop-blur-md">
                <p className="label-md text-white/40">Contacto</p>
                {resumenFases.contacto ? (
                  <>
                    <p className="mt-1 body-md">
                      {resumenFases.contacto.nombres} {resumenFases.contacto.apellidos}
                    </p>
                    <p className="text-sm text-white/60">{resumenFases.contacto.celular}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-white/50">No hay datos de contacto.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/40 p-5 text-left backdrop-blur-md">
                <p className="label-md text-white/40">
                  Lo que contaste por voz ({resumenFases.completitud.porcentaje}% de tu perfil)
                </p>
                {resumenFases.hallazgosPorVoz.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1">
                    {resumenFases.hallazgosPorVoz.map((h) => (
                      <li key={h.id} className="text-sm text-white/70">
                        <span className="capitalize">{h.tipo.replace(/_/g, " ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-white/50">Todavía no contaste nada por voz.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/40 p-5 text-left backdrop-blur-md">
                <p className="label-md text-white/40">Archivos adjuntos</p>
                {resumenFases.documentos.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1">
                    {resumenFases.documentos.map((d) => (
                      <li key={d.id} className="truncate text-sm text-white/70">
                        {d.nombre}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-white/50">No adjuntaste archivos.</p>
                )}
              </div>
            </div>
          )}

          {errorGenerar && (
            <p className="body-md text-error" role="alert">
              {errorGenerar}
            </p>
          )}

          <div className="flex w-full flex-col gap-3">
            <Button type="button" onClick={confirmarYGenerarPerfil} disabled={generandoPerfil || !resumenFases}>
              {generandoPerfil ? "Generando…" : "Confirmar y generar mi perfil"}
            </Button>
            <button
              type="button"
              onClick={() => setPasoPostVoz("integraciones")}
              className="label-md text-white/50 underline"
            >
              Volver a integraciones
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Grabando: pantalla blanca e inmersiva, el círculo domina, nada más.
  if (conectado) {
    return (
      <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-10 bg-white px-6 py-16">
        <BackHomeButton theme="light" />
        <AvatarUsuario theme="light" flotante />
        <ReactiveVoiceCircle conversation={conversation} theme="light" size="min(72vw, 62vh)" />

        <p className="text-sm font-medium text-black/50">
          {conversation.isSpeaking ? "Pa'lante está hablando…" : "Te escucho…"}
        </p>

        {error && (
          <p className="body-md text-error" role="alert">
            {error}
          </p>
        )}

        {mostrarTexto ? (
          <form onSubmit={enviarTexto} className="flex w-full max-w-sm gap-2">
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe…"
              className="flex-1 rounded-full border border-black/15 bg-transparent px-4 py-2 text-sm text-black outline-none focus:border-black"
            />
            <Button type="submit" variant="dark" className="shrink-0 px-4 py-2 text-sm">
              Enviar
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarTexto(true)}
            className="text-xs text-black/40 underline"
          >
            Prefiero escribir
          </button>
        )}

        <button
          type="button"
          onClick={terminarYVerPerfil}
          className="text-xs text-black/40 underline"
        >
          {suficiente ? "Ya sé suficiente — ver mi información" : "Terminar conversación"}
        </button>
      </div>
    );
  }

  // --- Reposo: mismo fondo/lenguaje de botones que la landing.
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-white">
      <VideoBackdrop />
      <BackHomeButton theme="dark" />
      <AvatarUsuario theme="dark" flotante />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <ReactiveVoiceCircle conversation={conversation} theme="dark" />

        <div className="max-w-md text-center">
          <h1 className="headline-md">Antes de todo, conozcámonos</h1>
          <p className="mt-2 body-md text-white/70">
            Con qué sueñas, qué meta financiera tienes en mente, cómo están tus finanzas hoy — en el orden que
            quieras, por voz o por texto.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-white/40">Elige una voz</p>
          <div className="flex flex-wrap justify-center gap-2">
            {VOCES.map((voz) => (
              <button
                key={voz.id}
                type="button"
                onClick={() => setVozId(voz.id)}
                disabled={conectando}
                aria-pressed={vozId === voz.id}
                title={voz.descripcion}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300 ${
                  vozId === voz.id
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                }`}
              >
                {voz.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={empezarConVoz} disabled={conectando} className="flex-1">
            🎤 Hablar
          </Button>
          <Button type="button" variant="secondary" onClick={empezarConTexto} disabled={conectando} className="flex-1">
            Escribir
          </Button>
        </div>

        {error && (
          <p className="body-md text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function VoiceOnboarding() {
  return (
    <ConversationProvider>
      <OnboardingInner />
    </ConversationProvider>
  );
}
