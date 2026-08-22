import type { Metadata } from "next";
import { Inter, Baloo_2 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pa'lante",
  description:
    "Tu vida financiera está escrita en tus correos y extractos. Pa'lante la reúne, te la devuelve ordenada y la convierte en un plan que avanza solo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${baloo2.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface text-foreground">
        {children}
      </body>
    </html>
  );
}
