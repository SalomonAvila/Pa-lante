import { ComponentType, SVGProps } from "react";

type RouteCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** clase de color semántico del token (ej. "text-debt", "text-positive") */
  accentClassName: string;
  chipClassName: string;
  tag: string;
  title: string;
  description: string;
};

export function RouteCard({
  icon: Icon,
  accentClassName,
  chipClassName,
  tag,
  title,
  description,
}: RouteCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <div className={`flex h-11 w-11 items-center justify-center rounded-md ${chipClassName}`}>
        <Icon className={`h-6 w-6 ${accentClassName}`} />
      </div>
      <span className="label-sm uppercase text-on-surface-variant">{tag}</span>
      <h3 className="font-heading text-lg font-bold text-on-surface">
        {title}
      </h3>
      <p className="body-md text-on-surface-variant">{description}</p>
    </div>
  );
}
