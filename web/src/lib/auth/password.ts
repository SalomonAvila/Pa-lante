/**
 * Reglas de fuerza de contraseña. Función pura: la usa tanto el checklist
 * visual del formulario de registro como la validación de submit, para que
 * nunca queden desincronizados.
 */
export type ReglaPassword = {
  id: "longitud" | "mayuscula" | "minuscula" | "numero" | "especial";
  descripcion: string;
  cumple: boolean;
};

export function evaluarPassword(password: string): ReglaPassword[] {
  return [
    {
      id: "longitud",
      descripcion: "Mínimo 10 caracteres",
      cumple: password.length >= 10,
    },
    {
      id: "mayuscula",
      descripcion: "Una letra mayúscula",
      cumple: /[A-Z]/.test(password),
    },
    {
      id: "minuscula",
      descripcion: "Una letra minúscula",
      cumple: /[a-z]/.test(password),
    },
    {
      id: "numero",
      descripcion: "Un número",
      cumple: /[0-9]/.test(password),
    },
    {
      id: "especial",
      descripcion: "Un carácter especial",
      cumple: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function passwordEsValida(password: string): boolean {
  return evaluarPassword(password).every((regla) => regla.cumple);
}
