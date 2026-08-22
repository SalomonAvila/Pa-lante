type ProgressBarProps = {
  /** 0 a 1 */
  value: number;
  /** Se cumplió la meta: la barra celebra pasando a un tono "feliz". */
  complete?: boolean;
};

export function ProgressBar({ value, complete = false }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-3 w-full overflow-hidden rounded-full bg-primary-container/20"
    >
      <div
        className={`h-full rounded-full transition-[width,background-color] duration-500 ${
          complete ? "bg-mascot-happy" : "bg-primary"
        }`}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
