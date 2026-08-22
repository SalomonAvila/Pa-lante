import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/session";
import { obtenerPanorama } from "@/lib/perfil/normalizacion";
import { calcularCompletitud } from "@/lib/perfil/completitud";
import { listarConexiones } from "@/lib/conectores/orquestador";
import { CATALOGO_FUENTES } from "@/lib/conectores/catalogo";
import { MetricaPrincipal } from "@/components/perfil/MetricaPrincipal";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/components/perfil/TablaFuentes";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";

const ETIQUETA_FUENTE: Record<string, string> = {
  conversacion: "Nos lo contaste tú",
  gmail: "Detectado en tu correo",
  pdf: "Detectado en un extracto",
  manual: "Lo cargaste a mano",
};

function formatoCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default async function PanoramaPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const [panorama, conexiones, completitud] = await Promise.all([
    obtenerPanorama(supabase, user.id),
    listarConexiones(supabase, user.id),
    calcularCompletitud(supabase, user.id),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="headline-md text-on-surface">Tu panorama financiero</h1>
        <p className="mt-1 body-md text-on-surface-variant">
          Cada cifra muestra de dónde salió — nunca mezclamos fuentes que se contradicen entre sí.
        </p>
        <div className="mt-4 flex flex-col gap-1 max-w-sm">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completitud.porcentaje}%` }}
            />
          </div>
          <p className="text-xs text-on-surface-variant">
            {completitud.porcentaje}% de tu perfil listo
            {completitud.camposFaltantes.length > 0 &&
              ` — todavía falta: ${completitud.camposFaltantes.join(", ")}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
        <MetricaPrincipal
          valor={formatoCOP(panorama.patrimonioNeto)}
          etiqueta="Patrimonio neto"
          tono={panorama.patrimonioNeto >= 0 ? "positivo" : "riesgo"}
        />
        <MetricaPrincipal valor={formatoCOP(panorama.deudaTotal)} etiqueta="Deuda total" />
        <MetricaPrincipal valor={formatoCOP(panorama.liquidezDisponible)} etiqueta="Liquidez disponible" />
        <MetricaPrincipal
          valor={formatoCOP(panorama.gastoMensualEstimado.valor)}
          etiqueta="Gasto mensual"
          fuente={panorama.gastoMensualEstimado.fuente}
        />
        <MetricaPrincipal valor={formatoCOP(panorama.activosTotales)} etiqueta="Activos totales" tono="positivo" />
        <MetricaPrincipal
          valor={panorama.nivelEndeudamiento != null ? `${Math.round(panorama.nivelEndeudamiento * 100)}%` : "—"}
          etiqueta="Nivel de endeudamiento"
          tono={panorama.nivelEndeudamiento != null && panorama.nivelEndeudamiento > 0.4 ? "riesgo" : "default"}
        />
      </div>

      {panorama.ingresosReportados.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="label-md text-on-surface-variant">Ingresos reportados</h2>
          <Table>
            <Thead>
              <tr>
                <Th>Valor mensual</Th>
                <Th>Fuente</Th>
                <Th>Procedencia</Th>
                <Th>Periodo</Th>
              </tr>
            </Thead>
            <tbody>
              {panorama.ingresosReportados.map((ingreso, i) => (
                <Tr key={i}>
                  <Td className="font-medium">{formatoCOP(ingreso.valor)}</Td>
                  <Td>{ingreso.fuente}</Td>
                  <Td className="capitalize">{ingreso.procedencia}</Td>
                  <Td>{ingreso.periodo ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="text-xs text-on-surface-variant">
            Mostramos cada fuente por separado a propósito — no elegimos una &quot;verdadera&quot; por ti.
          </p>
        </section>
      )}

      {panorama.hallazgos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="label-md text-on-surface-variant">Todo lo que sabemos de ti</h2>
          <Table>
            <Thead>
              <tr>
                <Th>Tipo</Th>
                <Th>Cómo lo sabemos</Th>
                <Th>Procedencia</Th>
                <Th>Periodo</Th>
              </tr>
            </Thead>
            <tbody>
              {panorama.hallazgos.map((h) => (
                <Tr key={h.id}>
                  <Td className="capitalize">{h.tipo.replace(/_/g, " ")}</Td>
                  <Td>{ETIQUETA_FUENTE[h.fuente] ?? h.fuente}</Td>
                  <Td className="capitalize">{h.procedencia}</Td>
                  <Td>{h.periodo ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="label-md text-on-surface-variant">Tus fuentes</h2>
          <Link href="/configuracion/privacidad" className="text-sm text-primary underline">
            Gestionar conexiones
          </Link>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>Fuente</Th>
              <Th>Estado</Th>
            </tr>
          </Thead>
          <tbody>
            {conexiones.map((c) => {
              const fuente = CATALOGO_FUENTES.find((f) => f.id === c.fuenteId);
              return (
                <Tr key={c.id}>
                  <Td>{fuente?.nombre ?? c.fuenteId}</Td>
                  <Td>
                    <span className={`label-sm ${ESTADO_COLOR[c.estado]}`}>{ESTADO_LABEL[c.estado]}</span>
                  </Td>
                </Tr>
              );
            })}
            {conexiones.length === 0 && (
              <Tr>
                <Td colSpan={2} className="text-on-surface-variant">
                  Todavía no conectaste ninguna fuente.{" "}
                  <Link href="/perfil/construyendo" className="text-primary underline">
                    Conectar ahora
                  </Link>
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
