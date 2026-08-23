"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { VideoBackdrop } from "@/components/shared/VideoBackdrop";
import styles from "./landing.module.css";

const NAVEGACION = [
  { etiqueta: "Inicio", href: "/" },
  { etiqueta: "Producto", href: "/intake" },
  { etiqueta: "API", href: "/api/v1" },
];

const METRICAS = [
  { simbolo: "+", objetivo: 7, sufijo: "", decimales: 0, etiqueta: "Fuentes verificadas" },
  { simbolo: "%", objetivo: 94.05, sufijo: "%", decimales: 2, etiqueta: "Ingreso respaldado" },
  { simbolo: "#", objetivo: 6, sufijo: " meses", decimales: 0, etiqueta: "Contexto observado" },
  { simbolo: "↗", objetivo: 2, sufijo: "", decimales: 0, etiqueta: "Salidas: API + MCP" },
] as const;

type EstiloConRetraso = CSSProperties & { "--d": string };

function conRetraso(retraso: string): EstiloConRetraso {
  return { "--d": retraso };
}

function easeOutCubic(valor: number): number {
  return 1 - Math.pow(1 - valor, 3);
}

export function LandingExperience() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [valores, setValores] = useState<number[]>(METRICAS.map(() => 0));
  const estadisticasRef = useRef<HTMLElement>(null);
  const conteoInicioRef = useRef(false);

  useEffect(() => {
    const seccion = estadisticasRef.current;
    if (!seccion) return;

    const reduceMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMovimiento) {
      const frame = requestAnimationFrame(() =>
        setValores(METRICAS.map((metrica) => metrica.objetivo)),
      );
      return () => cancelAnimationFrame(frame);
    }

    const frames = new Set<number>();
    const temporizadores = new Set<ReturnType<typeof setTimeout>>();

    function iniciarConteo() {
      if (conteoInicioRef.current) return;
      conteoInicioRef.current = true;

      METRICAS.forEach((metrica, indice) => {
        const temporizador = setTimeout(() => {
          const inicio = performance.now();
          const duracion = 1500 + indice * 80;

          function actualizar(ahora: number) {
            const progreso = Math.min((ahora - inicio) / duracion, 1);
            const valor = metrica.objetivo * easeOutCubic(progreso);
            setValores((actuales) =>
              actuales.map((actual, posicion) => (posicion === indice ? valor : actual)),
            );
            if (progreso < 1) frames.add(requestAnimationFrame(actualizar));
          }

          frames.add(requestAnimationFrame(actualizar));
        }, 480 + indice * 90);
        temporizadores.add(temporizador);
      });
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          iniciarConteo();
          observador.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observador.observe(seccion);

    return () => {
      observador.disconnect();
      frames.forEach(cancelAnimationFrame);
      temporizadores.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuAbierto);

    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAbierto(false);
    }

    function cerrarEnEscritorio() {
      if (window.innerWidth > 720) setMenuAbierto(false);
    }

    window.addEventListener("keydown", cerrarConEscape);
    window.addEventListener("resize", cerrarEnEscritorio);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", cerrarConEscape);
      window.removeEventListener("resize", cerrarEnEscritorio);
    };
  }, [menuAbierto]);

  return (
    <div className={styles.page}>
      <VideoBackdrop />

      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Pa'lante, inicio">
          <Image
            src="/hormiga-cargando-moneda.png"
            alt=""
            width={52}
            height={52}
            priority
          />
        </Link>

        <nav className={styles.navPill} aria-label="Navegación principal">
          {NAVEGACION.map((item, indice) => (
            <Link
              key={item.etiqueta}
              href={item.href}
              className={indice === 0 ? styles.navActivo : styles.navLink}
            >
              {item.etiqueta}
            </Link>
          ))}
        </nav>

        <Link href="/login" className={styles.entrarDesktop}>
          Entrar
        </Link>

        <button
          type="button"
          className={`${styles.burger} ${menuAbierto ? styles.burgerAbierto : ""}`}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div id="menu-movil" className={styles.menuCapa} hidden={!menuAbierto}>
        <button
          type="button"
          className={styles.menuOverlay}
          aria-label="Cerrar fondo del menú"
          onClick={() => setMenuAbierto(false)}
        />
        <nav className={styles.menuHoja} aria-label="Navegación móvil">
          {NAVEGACION.map((item, indice) => (
            <Link
              key={item.etiqueta}
              href={item.href}
              className={indice === 0 ? styles.menuActivo : styles.menuLink}
              style={conRetraso(`${0.05 + indice * 0.05}s`)}
              onClick={() => setMenuAbierto(false)}
            >
              {item.etiqueta}
            </Link>
          ))}
          <Link
            href="/login"
            className={styles.menuEntrar}
            style={conRetraso("0.25s")}
            onClick={() => setMenuAbierto(false)}
          >
            Entrar a Pa&apos;lante
          </Link>
        </nav>
      </div>

      <main className={styles.hero}>
        <div className={`${styles.confianza} ${styles.anim}`} style={conRetraso("0.05s")}>
          <div className={`${styles.avatar} ${styles.avatarUno}`}>
            <span><i className="fa-brands fa-google" aria-hidden="true" /></span>
          </div>
          <div className={`${styles.avatar} ${styles.avatarDos}`}>
            <span><i className="fa-solid fa-file-lines" aria-hidden="true" /></span>
          </div>
          <div className={`${styles.avatar} ${styles.avatarTres}`}>
            <span><i className="fa-solid fa-database" aria-hidden="true" /></span>
          </div>
          <div className={styles.confianzaPill}>Correo, extractos y fuentes públicas</div>
        </div>

        <h1 className={styles.headline}>
          <span className={styles.headlineUno}>Tus datos financieros</span>
          <span className={styles.headlineDos}>listos para moverse</span>
        </h1>

        <p className={`${styles.subhead} ${styles.anim}`} style={conRetraso("0.28s")}>
          Pa&apos;lante extrae y normaliza tu contexto financiero para que cualquier agente o
          sistema lo use con tu permiso.
        </p>

        <Link
          href="/intake"
          className={`${styles.cta} ${styles.pulso}`}
          style={conRetraso("0.4s")}
        >
          Conectar mis datos
        </Link>
      </main>

      <section ref={estadisticasRef} className={styles.estadisticas} aria-label="Cobertura de Daniela">
        {METRICAS.map((metrica, indice) => (
          <div
            key={metrica.etiqueta}
            className={`${styles.estadistica} ${styles.anim}`}
            style={conRetraso(`${0.5 + indice * 0.08}s`)}
          >
            <span className={styles.simbolo} aria-hidden="true">{metrica.simbolo}</span>
            <span className={styles.valor}>
              {valores[indice].toFixed(metrica.decimales)}{metrica.sufijo}
            </span>
            <span className={styles.etiqueta}>{metrica.etiqueta}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
