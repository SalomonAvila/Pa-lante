import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pa'lante",
  description:
    "Organiza tu contexto financiero y sigue un plan paso a paso automatizado.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-foreground">
        <div
          aria-hidden
          style={{ display: "none" }}
          dangerouslySetInnerHTML={{
            __html: `<!--
  THESIS: Prove the diagnosis-fits-you mechanism through an actual
  conversational exchange with the mascot, refusing the hero+3-fixed-
  category-cards default that implies a closed menu of outcomes.
  OWN-WORLD: Warm Financial Mentor tokens (surface/primary/tertiary,
  Inter headline/body/label utilities, radius sm-xl default 0.5rem,
  tonal layers, no shadows), housed ant mascot with mood tinting.
  STORY: Visitor tells the ant their real situation in their own
  words; the ant replies showing the plan is built for that specific
  case, not picked from a fixed list; CTA follows as the natural next
  step (connect Gmail / upload PDF).
  FIRST VIEWPORT: Single centered chat column. Housed ant avatar +
  question bubble, a labeled free-text input (not multiple-choice
  chips), submit reveals the visitor's bubble then the ant's tailored
  reply, then the two entry CTAs.
  FORM: "La conversación" - dealt lead (index 3) of 7 authored
  structures, concept-seed key 83290fe6, scope surface / mode
  persuade; adapted after user correction removing the 3-fixed-route
  framing from all marketing surfaces.
  FINISH: unreviewed and undocumented is unfinished; this build ends
  with the finish review, the verdict, DESIGN.md, and every shipping
  raster carrying its provenance.
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
