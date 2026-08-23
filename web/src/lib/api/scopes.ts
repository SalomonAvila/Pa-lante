/**
 * Scopes de acceso. Un token siempre lleva scopes explícitos: la promesa del
 * producto es que el dueño controla sus datos, y un token que lo lee todo no
 * es control, es un interruptor.
 */
export const SCOPES = {
  "perfil:leer": "Leer todo el perfil financiero (compatibilidad)",
  "perfil:identidad": "Compartir nombre y ciudad",
  "perfil:resumen": "Compartir el resumen, fortalezas y alertas",
  "perfil:ingresos": "Compartir ingresos declarados y observados",
  "perfil:flujo": "Compartir gastos y flujo libre",
  "perfil:obligaciones": "Compartir deudas y carga financiera",
  "perfil:patrimonio": "Compartir patrimonio reportado",
  "perfil:objetivo": "Compartir el problema u objetivo seleccionado",
  "perfil:acciones": "Compartir prioridades y próximos pasos",
  "perfil:calidad": "Compartir cobertura, calidad y datos faltantes",
  "hallazgos:leer": "Leer hallazgos individuales con su procedencia",
  "cobertura:leer": "Leer qué fuentes están conectadas y qué cubren",
  "prueba:generar": "Generar pruebas de divulgación para un tercero",
  exportar: "Exportar la totalidad de los datos en crudo",
} as const;

export type Scope = keyof typeof SCOPES;

export const SCOPES_DISPONIBLES = Object.keys(SCOPES) as Scope[];

/** Lo que recibe un token nuevo si no se especifica nada. */
export const SCOPES_PERFIL: Scope[] = [
  "perfil:identidad", "perfil:resumen", "perfil:ingresos", "perfil:flujo",
  "perfil:obligaciones", "perfil:patrimonio", "perfil:objetivo",
  "perfil:acciones", "perfil:calidad",
];

export const SCOPES_POR_DEFECTO: Scope[] = [
  "perfil:resumen", "perfil:objetivo", "perfil:calidad",
];

export function esScopeValido(valor: string): valor is Scope {
  return valor in SCOPES;
}

export function tieneScope(scopesDelToken: string[], requerido: Scope): boolean {
  return scopesDelToken.includes(requerido) ||
    (requerido.startsWith("perfil:") && scopesDelToken.includes("perfil:leer"));
}

export function tieneAlgunScopePerfil(scopes: string[]): boolean {
  return scopes.includes("perfil:leer") || SCOPES_PERFIL.some((scope) => scopes.includes(scope));
}
