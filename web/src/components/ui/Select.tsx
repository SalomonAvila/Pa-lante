import { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export function Select({ label, id, className = "", children, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="label-md text-on-surface-variant">
        {label}
      </label>
      <select
        id={selectId}
        className={`rounded-md border border-outline-variant bg-surface-container-low px-4 py-2 body-md text-on-surface outline-none focus:border-2 focus:border-on-surface ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
