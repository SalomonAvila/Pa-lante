import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Tus datos financieros, listos para moverse | Pa'lante",
  description:
    "Pa'lante extrae, normaliza y distribuye tu contexto financiero para que cualquier agente o sistema lo use con tu permiso.",
};

export default function Home() {
  return <LandingExperience />;
}
