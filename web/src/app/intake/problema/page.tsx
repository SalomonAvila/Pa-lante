import type { Metadata } from "next";
import { ProblemDiscovery } from "@/components/onboarding/ProblemDiscovery";

export const metadata: Metadata = {
  title: "¿Qué quieres lograr? | Pa'lante",
  description: "Elige el problema financiero que quieres trabajar con Pa'lante.",
};

export default function ProblemaPage() {
  return <ProblemDiscovery />;
}
