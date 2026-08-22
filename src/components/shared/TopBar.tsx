export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-6 py-4">
      <span className="text-lg font-bold tracking-[-0.02em] text-on-surface">
        Pa&apos;lante
      </span>
      <span className="rounded-full bg-primary-container px-3 py-1 label-sm uppercase text-on-primary-container">
        Diagnóstico completado
      </span>
    </header>
  );
}
