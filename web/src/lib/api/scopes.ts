/**
 * Scopes de acceso. Un token siempre lleva scopes explícitos: la promesa del
 * producto es que el dueño controla sus datos, y un token que lo lee todo no
 * es control, es un interruptor.
 */
export const SCOPES = {
  "perfil:leer": "Leer el perfil financiero agregado",
  "hallazgos:leer": "Leer hallazgos individuales con su procedencia",
  "cobertura:leer": "Leer qué fuentes están conectadas y qué cubren",
  "prueba:generar": "Generar pruebas de divulgación para un tercero",
  exportar: "Exportar la totalidad de los datos en crudo",
} as const;

export type Scope = keyof typeof SCOPES;

export const SCOPES_DISPONIBLES = Object.keys(SCOPES) as Scope[];

/** Lo que recibe un token nuevo si no se especifica nada. */
export const SCOPES_POR_DEFECTO: Scope[] = ["perfil:leer", "cobertura:leer"];

export function esScopeValido(valor: string): valor is Scope {
  return valor in SCOPES;
}

export function tieneScope(scopesDelToken: string[], requerido: Scope): boolean {
  return scopesDelToken.includes(requerido);
}
