import { evaluarPassword } from "@/lib/auth/password";

export function PasswordChecklist({ password }: { password: string }) {
  const reglas = evaluarPassword(password);

  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {reglas.map((regla) => (
        <li
          key={regla.id}
          className={`flex items-center gap-2 text-sm ${
            regla.cumple ? "text-positive" : "text-on-surface-variant"
          }`}
        >
          <span aria-hidden className="text-xs">
            {regla.cumple ? "✓" : "○"}
          </span>
          {regla.descripcion}
        </li>
      ))}
    </ul>
  );
}
