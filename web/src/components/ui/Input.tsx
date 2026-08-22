import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="label-md text-on-surface-variant">
        {label}
      </label>
      <input
        id={inputId}
        className={`rounded-md border border-outline-variant bg-surface-container-low px-4 py-2 body-md text-on-surface outline-none focus:border-2 focus:border-on-surface ${className}`}
        {...props}
      />
    </div>
  );
}
