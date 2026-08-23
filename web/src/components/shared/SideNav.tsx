"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/journey", label: "Mi camino" },
  { href: "/insights", label: "Diagnóstico" },
  { href: "/panorama", label: "Panorama" },
  { href: "/asistente", label: "Asistente" },
  { href: "/configuracion/privacidad", label: "Configuración" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-outline-variant bg-surface-container-lowest p-4 sm:flex">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-lg bg-surface-container-low px-3 py-2 body-md font-bold text-on-surface"
                : "rounded-lg px-3 py-2 body-md text-on-surface-variant transition-colors duration-500 hover:bg-primary-container/40 hover:text-on-surface"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
