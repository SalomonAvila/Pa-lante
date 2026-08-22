type Props = {
  valor: string;
  etiqueta: string;
  fuente?: string;
  tono?: "default" | "positivo" | "riesgo";
};

/**
 * Número grande sin card ni icono decorativo (sección 24 del pedido): la
 * jerarquía la da el tamaño/peso tipográfico, no un contenedor.
 */
export function MetricaPrincipal({ valor, etiqueta, fuente, tono = "default" }: Props) {
  const colorValor =
    tono === "positivo" ? "text-positive" : tono === "riesgo" ? "text-error" : "text-on-surface";

  return (
    <div className="flex flex-col gap-1">
      <span className={`text-3xl font-semibold tabular-nums ${colorValor}`}>{valor}</span>
      <span className="label-md text-on-surface-variant">{etiqueta}</span>
      {fuente && <span className="text-xs text-on-surface-variant">Fuente: {fuente}</span>}
    </div>
  );
}
