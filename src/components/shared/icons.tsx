import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const shared = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DebtIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <circle cx="12" cy="9" r="6" />
      <path d="M12 6.5v5M9.8 9.3 12 11.5l2.2-2.2" />
      <path d="M6 18.5h12" />
    </svg>
  );
}

export function VisibilityIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

export function GrowthIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M12 20V11" />
      <path d="M12 11c0-3.5-2-5.5-5.5-5.8C6.2 9 8.4 11 12 11Z" />
      <path d="M12 14c0-3 2-4.7 4.8-5C16.9 12 15 14 12 14Z" />
    </svg>
  );
}
