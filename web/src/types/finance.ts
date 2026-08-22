export type Transaccion = {
  fecha: string;
  monto: number;
  tipo: "ingreso" | "gasto";
  comercioRaw: string;
  comercioNorm: string;
  categoria: string;
  cuenta: string;
  fuente: "gmail" | "pdf";
  confianza: number;
};

export type Plan = {
  meta: string;
  aporteMensual: number;
  pasos: string[];
  supuestos: string[];
  fechaObjetivo: string;
};
