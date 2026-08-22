import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/session";
import { obtenerPerfilFinanciero } from "@/lib/perfil/obtener-perfil";
import { crearPruebaCapacidadPago } from "@/lib/perfil/perfil-financiero";
import { listarConexiones } from "@/lib/conectores/orquestador";
import { CATALOGO_FUENTES } from "@/lib/conectores/catalogo";
import { MetricaPrincipal } from "@/components/perfil/MetricaPrincipal";
import { ESTADO_COLOR, ESTADO_LABEL } from "@/components/perfil/TablaFuentes";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { ProgressBar } from "@/components/ui/ProgressBar";

function formatoCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoPorcentaje(valor: number | null): string {
  if (valor == null) return "—";
  return `${valor.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%`;
}

const ESTADO_PREPARACION = {
  sin_datos: "Faltan datos",
  requiere_datos: "Requiere más evidencia",
  listo_para_compartir: "Listo para compartir",
} as const;

export default async function PanoramaPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const [perfil, conexiones] = await Promise.all([
    obtenerPerfilFinanciero(supabase, user.id),
    listarConexiones(supabase, user.id),
  ]);
  const prueba = crearPruebaCapacidadPago(perfil);
  const porcentajeVerificado = prueba.porcentajeIngresoVerificado ?? 0;
  const listo = prueba.estadoPreparacion === "listo_para_compartir";

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="label-sm uppercase tracking-wide text-primary">Identidad financiera portable</p>
        <h1 className="mt-1 headline-md text-on-surface">Tu capacidad económica, respaldada por datos</h1>
        <p className="mt-1 body-md text-on-surface-variant">
          Pa&apos;lante reúne tus fuentes y demuestra contexto sin entregar tus extractos completos.
        </p>
      </div>

      <section className="grid gap-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.7fr)] lg:p-8">
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-5xl font-semibold tabular-nums text-positive sm:text-6xl">
              {formatoPorcentaje(prueba.porcentajeIngresoVerificado)}
            </span>
            <h2 className="mt-2 text-xl font-semibold text-on-surface">
              de tu ingreso declarado está respaldado por datos observados
            </h2>
          </div>
          <ProgressBar value={porcentajeVerificado / 100} complete={porcentajeVerificado >= 90} />
          <p className="body-md text-on-surface-variant">
            Contrastamos {perfil.periodo.mesesObservados} meses de movimientos con información
            declarada y fuentes externas. Una fuente que corrobora nunca se vuelve a sumar.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-5 border-t border-outline-variant pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 label-sm ${
                listo
                  ? "bg-surface-container-high text-positive"
                  : "bg-primary-container text-on-primary-container"
              }`}
            >
              {ESTADO_PREPARACION[prueba.estadoPreparacion]}
            </span>
            <p className="mt-4 label-sm uppercase text-on-surface-variant">Objetivo de acceso</p>
            <p className="mt-1 body-md font-medium text-on-surface">
              {perfil.objetivoAcceso?.descripcion ?? "Todavía no definiste un objetivo"}
            </p>
          </div>
          {prueba.canonMensualObjetivo != null && (
            <div>
              <span className="text-2xl font-semibold tabular-nums text-on-surface">
                {formatoCOP(prueba.canonMensualObjetivo)}
              </span>
              <p className="label-md text-on-surface-variant">Canon mensual que quieres demostrar</p>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold text-on-surface">Cómo construimos la prueba</h2>
          <p className="mt-1 body-md text-on-surface-variant">
            Cifras agregadas y reproducibles; ninguna depende de que una IA vuelva a hacer las cuentas.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
          <MetricaPrincipal
            valor={
              prueba.ingresoMensualVerificado == null
                ? "—"
                : formatoCOP(prueba.ingresoMensualVerificado)
            }
            etiqueta="Ingreso mensual verificado"
            fuente="Mediana observada"
            tono="positivo"
          />
          <MetricaPrincipal
            valor={formatoCOP(perfil.ingresos.declarado.valor ?? 0)}
            etiqueta="Ingreso mensual declarado"
            fuente="Confirmado por ti"
          />
          <MetricaPrincipal
            valor={formatoPorcentaje(prueba.variacionMensualIngreso)}
            etiqueta="Variación mensual del ingreso"
          />
          <MetricaPrincipal
            valor={formatoPorcentaje(prueba.cargaFinanciera)}
            etiqueta="Carga financiera conocida"
          />
          <MetricaPrincipal
            valor={formatoPorcentaje(prueba.relacionCanonIngreso)}
            etiqueta="Relación canon / ingreso"
          />
          <MetricaPrincipal
            valor={`${Math.round(prueba.confianzaPerfil * 100)}%`}
            etiqueta="Confianza del perfil"
            fuente={`${prueba.fuentesIndependientes} fuentes independientes`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold text-on-surface">Lo que recibiría una entidad autorizada</h2>
          <p className="mt-1 body-md text-on-surface-variant">
            La prueba demuestra contexto. La inmobiliaria conserva sus propias reglas y decisiones.
          </p>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>Dato compartido</Th>
              <Th>Valor</Th>
              <Th>Cómo se obtuvo</Th>
            </tr>
          </Thead>
          <tbody>
            <Tr>
              <Td>Ingreso mensual verificado</Td>
              <Td className="font-medium tabular-nums">
                {prueba.ingresoMensualVerificado == null
                  ? "—"
                  : formatoCOP(prueba.ingresoMensualVerificado)}
              </Td>
              <Td>Mediana de {perfil.periodo.mesesObservados} meses observados</Td>
            </Tr>
            <Tr>
              <Td>Ingreso declarado respaldado</Td>
              <Td className="font-medium tabular-nums">
                {formatoPorcentaje(prueba.porcentajeIngresoVerificado)}
              </Td>
              <Td>Ingreso verificado / ingreso declarado</Td>
            </Tr>
            <Tr>
              <Td>Estabilidad del ingreso</Td>
              <Td className="font-medium tabular-nums">
                {formatoPorcentaje(prueba.variacionMensualIngreso)} de variación
              </Td>
              <Td>Comparación entre meses</Td>
            </Tr>
            <Tr>
              <Td>Carga financiera</Td>
              <Td className="font-medium tabular-nums">
                {formatoPorcentaje(prueba.cargaFinanciera)}
              </Td>
              <Td>Cuotas conocidas / ingreso verificado</Td>
            </Tr>
          </tbody>
        </Table>
        <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="body-md text-on-surface">
            <span className="font-semibold">Se queda privado:</span> comercios, números de cuenta,
            extractos, conversaciones y documentos originales.
          </p>
          <Link href="/configuracion/privacidad" className="shrink-0 text-sm font-medium text-primary underline">
            Revisar permisos
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-on-surface">Fuentes conectadas</h2>
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
