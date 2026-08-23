"use client";

import { FormEvent, useEffect, useState } from "react";
import { AvatarUsuario } from "@/components/auth/AvatarUsuario";
import { BackHomeButton } from "@/components/shared/BackHomeButton";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import { DebtIcon, GrowthIcon, VisibilityIcon } from "@/components/shared/icons";
import { VoiceOnboarding, CLAVE_PASO_POST_VOZ } from "@/components/onboarding/VoiceOnboarding";
import {
  PROBLEMAS_FINANCIEROS,
  type ProblemaFinanciero,
  type ProblemaSeleccionado,
} from "@/lib/problemas/catalogo";
import styles from "./problem-discovery.module.css";

type IconoProps = { className?: string };

function TargetIcon({ className }: IconoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="m15 9 5-5m0 0v4m0-4h-4" />
    </svg>
  );
}

function HomeIcon({ className }: IconoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="m3.5 10 8.5-7 8.5 7" />
      <path d="M5.5 9v11h13V9M9.5 20v-6h5v6" />
    </svg>
  );
}

function DocumentIcon({ className }: IconoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M6 2.5h8l4 4V21H6z" />
      <path d="M14 2.5v4h4M9 11h6M9 15h6" />
    </svg>
  );
}

function IconoProblema({ problema }: { problema: ProblemaFinanciero }) {
  const className = styles.cardIcon;
  if (problema.icono === "deuda") return <DebtIcon className={className} aria-hidden="true" />;
  if (problema.icono === "crecimiento") return <GrowthIcon className={className} aria-hidden="true" />;
  if (problema.icono === "visibilidad") return <VisibilityIcon className={className} aria-hidden="true" />;
  if (problema.icono === "meta") return <TargetIcon className={className} />;
  if (problema.icono === "vivienda") return <HomeIcon className={className} />;
  return <DocumentIcon className={className} />;
}

export function ProblemDiscovery() {
  const [seleccionado, setSeleccionado] = useState<ProblemaSeleccionado | null>(null);
  const [otro, setOtro] = useState("");
  const [mostrarOtro, setMostrarOtro] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversando, setConversando] = useState(false);

  useEffect(() => {
    let activo = true;
    fetch("/api/perfil/problema")
      .then(async (respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((datos) => {
        if (!activo || !datos?.problema) return;
        setSeleccionado(datos.problema as ProblemaSeleccionado);
        // Si venimos de un redirect completo (ej. OAuth de Gmail desde
        // integraciones) con progreso ya guardado, entra directo a la
        // conversación en vez de pedir otro clic — el problema ya estaba
        // elegido antes de irse.
        if (sessionStorage.getItem(CLAVE_PASO_POST_VOZ)) setConversando(true);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  function elegir(problema: ProblemaFinanciero) {
    setSeleccionado({ id: problema.id, titulo: problema.titulo, descripcion: problema.descripcion });
    setMostrarOtro(false);
    setError(null);
  }

  async function guardarYConversar(problema: ProblemaSeleccionado) {
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/perfil/problema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          problema.id === "otro" ? { id: "otro", titulo: problema.titulo } : { id: problema.id },
        ),
      });
      const datos = await respuesta.json().catch(() => null);
      if (!respuesta.ok) throw new Error(datos?.error ?? "No pudimos guardar tu elección.");
      setSeleccionado(datos.problema as ProblemaSeleccionado);
      setConversando(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar tu elección.");
    } finally {
      setGuardando(false);
    }
  }

  function enviarOtro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const titulo = otro.trim();
    if (titulo.length < 8) {
      setError("Cuéntanos un poco más para poder adaptar la conversación.");
      return;
    }
    const problema: ProblemaSeleccionado = {
      id: "otro",
      titulo,
      descripcion: "Problema descrito por ti.",
    };
    setSeleccionado(problema);
    void guardarYConversar(problema);
  }

  if (conversando && seleccionado) {
    return <VoiceOnboarding problemaInicial={seleccionado} />;
  }

  return (
    <main className={styles.page}>
      <VideoBackdrop />
      <div className={styles.scrim} aria-hidden="true" />
      <BackHomeButton theme="dark" />
      <AvatarUsuario theme="dark" flotante />

      <section className={styles.content} aria-labelledby="titulo-problema">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Tu contexto, puesto a trabajar</p>
          <h1 id="titulo-problema" className={styles.title}>
            ¿Qué quieres lograr con tus finanzas?
          </h1>
          <p className={styles.subtitle}>
            Elige lo que más se parece a tu situación. Pa&apos;lante usará tus datos para hacerte
            preguntas útiles y construir contexto alrededor de ese objetivo.
          </p>
        </div>

        <div className={styles.grid} aria-label="Problemas que Pa'lante puede ayudarte a trabajar">
          {PROBLEMAS_FINANCIEROS.map((problema, indice) => {
            const activo = seleccionado?.id === problema.id;
            return (
              <div key={problema.id} className={styles.cardFloat} style={{ animationDelay: `${indice * -0.7}s` }}>
                <button
                  type="button"
                  className={`${styles.card} ${styles[problema.color]} ${activo ? styles.cardSelected : ""}`}
                  onClick={() => elegir(problema)}
                  aria-pressed={activo}
                >
                  <span className={styles.cardTop}>
                    <IconoProblema problema={problema} />
                    <span className={styles.cardNumber}>0{indice + 1}</span>
                  </span>
                  <span className={styles.cardTitle}>{problema.titulo}</span>
                  <span className={styles.cardDescription}>{problema.descripcion}</span>
                  <span className={styles.cardAction}>{activo ? "Elegido" : "Elegir este"}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          {mostrarOtro ? (
            <form className={styles.customForm} onSubmit={enviarOtro}>
              <label htmlFor="otro-problema">¿Qué te gustaría resolver?</label>
              <div className={styles.customRow}>
                <input
                  id="otro-problema"
                  autoFocus
                  value={otro}
                  onChange={(evento) => setOtro(evento.target.value)}
                  placeholder="Ej. Quiero ordenar mis finanzas antes de cambiar de trabajo"
                  maxLength={240}
                />
                <button type="submit" disabled={guardando || otro.trim().length < 8}>
                  Conversar
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className={styles.otherButton} onClick={() => setMostrarOtro(true)}>
              Tengo otro problema en mente
            </button>
          )}

          {seleccionado && !mostrarOtro && (
            <button
              type="button"
              className={styles.continueButton}
              onClick={() => void guardarYConversar(seleccionado)}
              disabled={guardando}
            >
              {guardando ? "Guardando…" : "Conversar sobre esto"}
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.trust}>Puedes cambiar de objetivo cuando quieras. Tus datos siguen siendo tuyos.</p>
      </section>
    </main>
  );
}
