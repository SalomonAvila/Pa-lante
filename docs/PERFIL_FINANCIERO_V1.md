# Perfil financiero portable V1

## Tesis

Pa'lante no compite con un chat generalista. Es la capa de datos que convierte
información financiera dispersa en hechos vigentes, trazables y compartibles
con consentimiento. Claude, la web y cualquier otro agente son consumidores
del mismo perfil.

## Historia de demo

Daniela trabaja por cuenta propia y quiere demostrar capacidad económica para
un arriendo de $1.300.000 sin entregar sus extractos ni revelar sus compras.
Declara $4.200.000 mensuales. Seis meses de datos de Nequi/Bancolombia respaldan
una mediana de $3.950.000: 94,05% de su ingreso declarado es verificable.

La demostración no aprueba ni rechaza el arriendo. Produce contexto auditable
para que la entidad receptora aplique sus propias reglas.

## North Star

`porcentaje_ingreso_verificado = ingreso_verificado / ingreso_declarado * 100`

- `ingreso_declarado`: último hallazgo `income` declarado/confirmado.
- `ingreso_verificado`: mediana de los ingresos mensuales observados.
- DIAN u otras fuentes corroboran la cifra, pero nunca se suman al flujo
  bancario porque representarían el mismo ingreso.

## Contratos

- `PerfilFinancieroV1`: perfil completo para el dueño, web y chat.
- `PruebaCapacidadPagoV1`: divulgación mínima para un tercero. No incluye
  transacciones, comercios, cuentas, documentos ni IDs de evidencia.
- `obtenerPerfilFinanciero(supabase, userId)`: única entrada para calcularlo.
- `crearPruebaCapacidadPago(perfil)`: genera la vista compartible.

Código:

- `web/src/types/finance.ts`
- `web/src/lib/perfil/perfil-financiero.ts`
- `web/src/lib/perfil/obtener-perfil.ts`
- `web/src/lib/perfil/fixtures/daniela.ts`

## API web

`GET /api/perfil/financiero`

Usa el usuario autenticado de la sesión. No acepta `user_id` enviado por el
cliente. Las consultas siguen protegidas por las políticas RLS existentes.

## Persistencia de la meta

La tabla `planes` conserva `meta` como descripción humana y agrega:

- `tipo_meta = 'demostrar_capacidad_arriendo'`
- `datos_meta.canon_mensual_objetivo`
- `datos_meta.ingreso_mensual_declarado`

La migración mantiene compatibilidad con planes anteriores: `tipo_meta` puede
ser nulo y `datos_meta` inicia como objeto vacío.

## Reglas de integración

### Ingesta

- Escribe observaciones; no calcula el perfil.
- Cada hallazgo conserva fuente, periodo, procedencia y confianza.
- Un dato contradictorio crea otra observación; no sobrescribe la anterior.

### UI

- Consume `obtenerPerfilFinanciero()` o el endpoint.
- Muestra por separado ingreso declarado, verificado y porcentaje respaldado.
- `estadoPreparacion` describe suficiencia de evidencia, no elegibilidad.

### MCP

- No replica sumas ni reglas.
- Para el dueño puede devolver `PerfilFinancieroV1`.
- Para una entidad debe devolver `PruebaCapacidadPagoV1` y registrar el acceso.

Herramienta implementada:

- `obtener_prueba_capacidad_pago`: solo lectura, sin argumentos y con propósito
  fijo `evaluar_capacidad_arriendo`. Registra tanto accesos exitosos como
  fallidos en `mcp_accesos`.
- En modo `MCP_DEMO_TOKEN` usa el mismo fixture ficticio de Daniela.
- En modo real resuelve el usuario desde el Bearer token y filtra cada consulta
  a Supabase por ese `user_id`; nunca acepta la identidad como argumento.

## Verificación

```bash
cd web
bun test src/lib/perfil/perfil-financiero.test.ts
bunx eslint src/types/finance.ts src/lib/perfil/perfil-financiero.ts \
  src/lib/perfil/obtener-perfil.ts src/lib/perfil/perfil-financiero.test.ts \
  src/lib/perfil/fixtures/daniela.ts src/app/api/perfil/financiero/route.ts
```

La suite cubre cálculo de la métrica, deuda duplicada con nombres distintos,
payload de meta incompleto, ausencia honesta de datos y privacidad de la prueba
compartible.
