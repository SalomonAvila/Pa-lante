import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import styles from "@/components/auth/login.module.css";

export const metadata: Metadata = {
  title: "Entrar · Pa'lante",
  description: "Entra a Pa'lante con Google o con un enlace a tu correo.",
};

export default function LoginPage() {
  return (
    <div className={styles.page}>
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
      </header>

      <main className={styles.main}>
        <h1 className={styles.titulo}>Entra</h1>
        <p className={styles.subtitulo}>
          Sin contraseñas. Tu contexto financiero sigue siendo tuyo.
        </p>
        <LoginForm />
      </main>
    </div>
  );
}
