export type ProgressStep = {
  label: string;
  status: "done" | "current" | "upcoming";
};

type ProgressPathProps = {
  steps: ProgressStep[];
};

const NODE_RADIUS = 22;
const ROW_HEIGHT = 96;
const AMPLITUDE = 60;
const CENTER_X = 100;

const STATUS_FILL: Record<ProgressStep["status"], string> = {
  done: "var(--color-primary)",
  current: "var(--color-primary)",
  upcoming: "var(--color-surface-container-high)",
};

export function ProgressPath({ steps }: ProgressPathProps) {
  const points = steps.map((_, i) => ({
    x: CENTER_X + (i % 2 === 0 ? -AMPLITUDE : AMPLITUDE),
    y: NODE_RADIUS + i * ROW_HEIGHT,
  }));

  const height = points.length > 0 ? points[points.length - 1].y + NODE_RADIUS : 0;

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${CENTER_X * 2} ${height}`}
      width={CENTER_X * 2}
      height={height}
      className="mx-auto"
    >
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-outline-variant)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="2 14"
      />
      {points.map((p, i) => (
        <g key={steps[i].label}>
          <circle
            cx={p.x}
            cy={p.y}
            r={NODE_RADIUS}
            fill={STATUS_FILL[steps[i].status]}
            stroke={
              steps[i].status === "current" ? "var(--color-debt)" : "none"
            }
            strokeWidth={3}
          />
          <text
            x={p.x}
            y={p.y + NODE_RADIUS + 18}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            fill="var(--color-foreground)"
          >
            {steps[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}
