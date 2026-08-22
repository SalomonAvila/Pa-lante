type RouteCardProps = {
  emoji: string;
  title: string;
  description: string;
};

export function RouteCard({ emoji, title, description }: RouteCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-large border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <span className="text-3xl">{emoji}</span>
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h3>
      <p className="text-sm leading-[1.6] text-outline">{description}</p>
    </div>
  );
}
