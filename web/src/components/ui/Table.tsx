import { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/**
 * Tabla densa para vistas de producto financiero (progreso de fuentes,
 * hallazgos, movimientos) — no todo bloque de información es una card.
 */
export function Table({ className = "", ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded border border-outline-variant/60">
      <table className={`w-full border-collapse text-left ${className}`} {...props} />
    </div>
  );
}

export function Thead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-surface-container" {...props} />;
}

export function Th({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`label-sm border-b border-outline-variant/60 px-4 py-3 uppercase tracking-wide text-on-surface-variant ${className}`}
      {...props}
    />
  );
}

export function Td({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`body-md px-4 py-3 text-on-surface ${className}`} {...props} />;
}

export function Tr({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-b border-outline-variant/30 last:border-0 ${className}`} {...props} />;
}
