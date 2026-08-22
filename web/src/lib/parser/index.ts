import type { Transaccion } from "@/types/finance";

// Placeholder: la normalización real (correo/PDF -> Transaccion) todavía no
// está implementada. Ver "Próximos pasos sugeridos" en CLAUDE.MD.
export function parseEmail(_raw: string): Transaccion[] {
  return [];
}

export function parsePdf(_raw: ArrayBuffer): Transaccion[] {
  return [];
}
