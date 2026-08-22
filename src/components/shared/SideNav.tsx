import Link from "next/link";

const LINKS = [
  { href: "/journey", label: "Mi camino" },
  { href: "/insights", label: "Diagnóstico" },
];

export function SideNav() {
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-outline-variant bg-surface-container-low p-4 sm:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-medium px-3 py-2 text-sm font-medium text-outline hover:bg-primary-container hover:text-primary"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
