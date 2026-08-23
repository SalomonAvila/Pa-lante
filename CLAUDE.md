# Proyecto: Finanzas personales — web app + servidor MCP

Este archivo es la fuente de verdad del proyecto. Toda sesión de Claude Code debe leerlo completo antes de tocar cualquier archivo.

---


## Los dos frentes

Este proyecto tiene **dos productos distintos que comparten el mismo modelo de datos**:

| Frente | Qué es | Quién lo usa |
|--------|--------|--------------|
| **Web app** (Next.js) | Donde el usuario conecta fuentes, ve su cobertura y administra quién accede a sus datos | El dueño de los datos |
| **Servidor MCP** | Expone el contexto financiero normalizado del usuario como herramientas consumibles por agentes de IA externos | Otros agentes, integraciones, demos del track Access |

Ambos frentes leen del mismo modelo de datos (Supabase). El MCP no tiene UI — solo expone tools con el contexto ya procesado.

---

## Objetivo del producto

**Pa'lante es infraestructura de datos financieros personales.** Somos
especialistas en tres cosas, en este orden:

1. **Extraer** el contexto financiero de una persona de la forma más sencilla
   posible, desde tantas fuentes como se pueda.
2. **Normalizar** todo eso a un modelo único, trazable y versionado.
3. **Distribuir** ese perfil por API y por servidor MCP, para que cualquier
   agente o sistema de IA lo consuma con permiso del dueño.

**Problema central:** el contexto financiero de una persona existe, pero está
atrapado en correos, PDFs con clave y portales de entidades. Ningún sistema
puede leerlo, y menos actuarlo. Nosotros somos el habilitador.

**La métrica del producto es la cobertura:** qué porcentaje del contexto
financiero de una persona logramos capturar y verificar.

### Dónde entra la capa de expertos

El núcleo no aconseja: entrega datos con procedencia y confianza. Los once
expertos y el chat de `/asistente` **no son el producto** — son la
**demostración** de lo que un agente externo puede construir encima del MCP,
y por eso viven fuera del núcleo (`web/src/lib/inteligencia/`, expuestos como
tools del MCP en `mcp/src/tools/`). Reglas que esto impone:

- `PerfilFinancieroV1`, `CoberturaPerfil` y las vistas de divulgación **no
  cambian** para acomodar a un experto. Si un experto necesita un campo nuevo
  en el núcleo, la respuesta por defecto es que no.
- Un experto solo lee por las mismas puertas que un tercero (`datos.ts` filtra
  por `user_id`; el MCP registra cada llamada en `mcp_accesos`). Nada de rutas
  privilegiadas.
- Quitar la capa de expertos completa debe dejar el producto en pie. Hoy casi:
  el núcleo web (`api/v1/*`, `perfil-financiero.ts`, `obtener-perfil.ts`) no
  importa nada de `inteligencia/`, pero dos tools *de datos* del MCP
  (`buscar-transacciones`, `obtener-plan`) sí leen `inteligencia/datos.ts`.
  `datos.ts` no usa el LLM — es acceso a datos puro — así que la dirección de
  la dependencia está invertida. Pendiente: moverlo fuera de `inteligencia/`.

## Flujo completo del producto

### 1. Ingesta de contexto financiero

Todas las fuentes corren en paralelo con `Promise.all()` — ninguna bloquea a la otra:

```
Promise.all([
  consultarCIFIN(cedula),        // deudas, bancos activos, score
  consultarBanrep(),             // tasas DTF, IBR, usura vigente
  consultarDANE(ciudad),         // IPC local, canasta familiar
  parsearGmail(token),           // notificaciones bancarias
  parsearPDFs(archivos)          // extractos subidos manualmente
])
```

**Fuentes de datos por capa de consentimiento:**

| Capa | Fuente | Qué obtienes | Fricción |
|------|--------|-------------|---------|
| Sin consentimiento | Banco República, DANE, SFC | Tasas, IPC, usura vigente | Ninguna |
| Cédula + checkbox | CIFIN / DataCrédito API | Deudas, bancos activos, score, cuentas | Mínima |
| Gmail OAuth | Notificaciones bancarias | Transacciones Nequi, Daviplata, PSE | 1 clic |
| Belvo / Finerio OAuth | Bancos con API | Saldos, historial completo | OAuth por banco |
| DIAN (opcional) | Renta declarada | Ingresos reales, patrimonio | Credenciales DIAN |

**Regla de encadenamiento:** CIFIN se consulta primero con la cédula → devuelve qué bancos tiene el usuario → solo mostramos esos bancos en el OAuth de Belvo. El usuario nunca ve una lista de 50 bancos.

**Qué se infiere sin preguntar:**
- De la cédula: ciudad de nacimiento, rango de edad
- De los patrones de transacción: empleado formal vs. independiente
- De los comercios: perfil de consumo
- De la IP: ciudad actual → ajuste de IPC local

### 2. Normalización

```
Correo/PDF crudo → Parser → Transaccion estructurada
Ejemplo: "COMPRA PSE *DLO*RAPPI BOG 23,500" →
{ comercio_norm: "Rappi", categoria: "Alimentación", confianza: 0.92 }
```

El parser se construye y prueba contra fixtures locales (`/fixtures/`), no contra Gmail en vivo. Gmail es una fuente intercambiable, no una dependencia.

### 3. Diagnóstico (router con reglas explícitas)

```
IF deuda_alto_costo > 30% ingreso_mensual  → RUTA: salida_deudas
ELSE IF flujo_neto < 0 OR sin_categorizar > 25%  → RUTA: visibilidad
ELSE  → RUTA: meta_ahorro
```

Los umbrales están escritos en código visible, no "la IA decidió".

### 4. Generación del plan (motor IA)

**El plan NO es un roadmap lineal. Es un árbol de carriles paralelos no bloqueantes.**

El número de carriles, la profundidad de cada uno y las tareas específicas son generados por el modelo a partir del contexto real. No hay plantillas fijas. Si alguien tiene 5 deudas, puede tener 7 carriles. Si no tiene deudas, puede tener 2. El modelo genera exactamente lo que el dolor del usuario justifica.

**Señales que generan carriles (ejemplos, no lista cerrada):**
- Deuda con tasa > 20% E.A. → carril "Salida [banco] $X"
- Flujo neto negativo → carril "Reducir gasto"
- Sin fondo de emergencia → carril "Fondo emergencia"
- Suscripciones sin uso detectadas → carril "Cancelar suscripciones" con las N tareas concretas
- Score crediticio + tasa alta → carril "Conseguir tarjeta con menor tasa"
- Ingreso nuevo detectado en Gmail → nuevo carril de oportunidad generado dinámicamente

**Tipos de carril:**
- `secuencial` — los pasos se desbloquean uno a uno dentro del carril
- `paralelo` — corre simultáneamente con otros carriles, no los bloquea
- `en_espera` — el carril está activo pero aguardando algo externo (ej. aprobación de tarjeta)
- `siempre_activo` — tareas sin orden, el usuario las ataca cuando puede

**Pasos auto-detectables:** cuando el sistema detecta la transacción en Gmail o vía Belvo, marca el paso solo. El usuario no tiene que volver a la app a confirmar nada.

### 5. Seguimiento (vistas derivadas del mismo modelo)

Las tres vistas no son módulos separados — son queries sobre `Transaccion` + `NodoPlan`:
- **Recordatorios** → `NodoPlan.pasos[]` con fecha
- **Alertas de desvío** → `Transaccion` real vs. `NodoPlan.aporte_mensual`
- **Proyecciones** → aritmética sobre flujo neto + supuestos del plan

---

## Modelo de datos

### Transaccion

```typescript
interface Transaccion {
  id: string
  fecha: Date
  monto: number                        // COP
  tipo: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA'
  comercio_raw: string                 // descripción original
  comercio_norm: string                // "Rappi"
  categoria: string                    // "Alimentación"
  cuenta: string                       // "Nequi", "Falabella"
  fuente: 'gmail' | 'pdf' | 'belvo'
  confianza: number                    // 0.0 – 1.0
  usuario_id: string
  created_at: Date
}
```

### NodoPlan (árbol del plan)

```typescript
interface NodoPlan {
  id: string
  usuario_id: string
  titulo: string                       // específico: "Abonar $450K a Falabella el 15 sep"
  tipo: 'accion' | 'consulta' | 'decision' | 'meta'
  tipo_carril: 'secuencial' | 'paralelo' | 'en_espera' | 'siempre_activo'
  urgencia: 1 | 2 | 3                 // 1 = crítico
  estado: 'bloqueado' | 'activo' | 'en_progreso' | 'completado'
  dependencias: string[]              // IDs de nodos que deben completarse antes
  paralelos: string[]                 // IDs de nodos que corren al mismo tiempo
  hijos: string[]                     // qué se desbloquea al completar este
  auto_detectable: boolean            // ¿el sistema lo marca solo?
  fuente_deteccion?: 'gmail' | 'belvo' | 'manual'
  aporte_mensual?: number             // para alertas de desvío
  fecha_objetivo?: Date
  resultado?: unknown
  created_at: Date
  updated_at: Date
}
```

### EstadoFinanciero (calculado, no persistido)

```typescript
interface EstadoFinanciero {
  ingreso_mensual_promedio: number
  gasto_mensual_promedio: number
  deudas: { acreedor: string; monto: number; tasa: number; plazo?: number }[]
  flujo_neto: number
  gasto_por_categoria: Record<string, number>
  gasto_sin_categorizar_pct: number
  confianza_datos: number             // 0.0 – 1.0
}
```

---

## Stack

### Web app

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js — App Router (no Pages Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Package manager | Bun |
| Auth | Supabase Auth (`@supabase/ssr`) — Google OAuth + Magic Link |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Linting | ESLint + Prettier |

### Servidor MCP

- Servidor independiente (Node.js / TypeScript), transporte HTTP **sin estado** con el SDK oficial.
- **Dos entry points, un solo handler** (`mcp/src/handler.ts`): `mcp/src/index.ts` levanta un proceso largo (local, Render, cualquier VM) y `mcp/api/mcp.ts` es la función serverless de Vercel. La ruta pública es `/mcp` en ambos (`mcp/vercel.json` reescribe `/mcp` → `/api/mcp`), así que el mismo curl y la misma config de Claude Desktop sirven en los dos. Vercel nunca ejecuta un `.listen()` — solo invoca funciones bajo `api/*.ts` por request — por eso el servidor de proceso largo no se puede desplegar ahí tal cual.
- Se despliega como **proyecto de Vercel aparte**, con Root Directory `mcp`. El proyecto de `web/` no lo incluye.
- Autenticación por **Bearer token propio**, no OAuth 2.1 (decisión de hackathon). Los tokens se guardan **hasheados** (sha256) en `mcp_tokens`; el valor en claro se muestra una sola vez.
- `mcp/src/lib/auth.ts` es el **único** archivo que usa `SUPABASE_SERVICE_ROLE_KEY`. Un agente llama sin sesión de navegador, así que no hay `auth.uid()` y RLS no aplica: toda consulta filtra explícitamente por `user_id`. RLS sigue cubriendo al cliente web.
- Cada llamada se registra en `mcp_accesos` — es lo que permite mostrarle al usuario quién leyó su contexto y revocarlo.
- Tools: `explicar_diagnostico` (lista). Pendientes: `obtener_contexto_financiero`, `buscar_transacciones`, `obtener_plan`, `simular_escenario`.
- Con `MCP_DEMO_TOKEN` el servidor responde contra `mcp/src/fixtures/estado-ejemplo.ts` sin tocar Postgres. **Quitar en producción.**
- El modelo de datos NO se duplica: `mcp/tsconfig.json` mapea `@web/*` a `web/src/*`, así que los tipos de `web/src/types/finance.ts` son la única fuente de verdad para ambos frentes.

---

## Auth (decisiones de hackathon)

- **Cuenta semilla para demos: `palante.platanus@gmail.com`.** Buzón creado para la hackathon, sin correo real dentro, así que se puede entrar por enlace mágico o por Google indistintamente. Sus datos financieros son ficticios y se cargan con `supabase/seed.sql`. Nunca demostrar con la cuenta personal de nadie del equipo.

- Tres vías de entrada: **Google OAuth**, **enlace mágico por correo**, y **registro con correo + contraseña** (`/registro`). El hashing de la contraseña lo resuelve Supabase Auth (`signUp` / `signInWithPassword`) — no hay hashing propio en el código. La verificación de correo tras el registro usa `verifyOtp({ type: "signup" })` con un código de 6 dígitos, no el enlace por defecto.
- El botón de Google pide `gmail.readonly` en el mismo consent. El token de Google queda en `session.provider_token` (ver `src/lib/supabase/session.ts`). **Vive ~1h y no se refresca solo** — si expira, el usuario reconecta desde `/intake`.
- Un usuario que entró por enlace mágico no tiene Gmail conectado; puede subir PDFs.
- Aislamiento de datos por usuario con **RLS** en todas las tablas.
- El `service_role key` nunca va al cliente ni al `.env.example`.
- Rutas protegidas: `/journey`, `/insights`, `/intake` — middleware `src/proxy.ts` usa `getUser()`, no `getSession()`.

---

## Sistema de inteligencia financiera conversacional (Fase 1)

> **Alcance:** esta capa es la demostración del MCP, no el núcleo del producto
> — ver "Dónde entra la capa de expertos" arriba. El consejo lo da el agente
> que consume Pa'lante; Pa'lante entrega los datos con los que se construye.


Además del diagnóstico por reglas explícitas, existe una capa conversacional que interpreta lo
que el usuario necesita, decide qué expertos consultar (en paralelo cuando corresponde), y
sintetiza una respuesta citando procedencia y nivel de confianza. Vive en
`web/src/lib/inteligencia/` y la comparten dos superficies: el chat propio (`/asistente` →
`web/src/app/api/conversar/route.ts`, streaming por SSE) y el servidor MCP (para agentes
externos) — ninguna lógica de dominio se duplica entre las dos.

**Orquestador** (`inteligencia/orquestador.ts`): loop manual con `claude-opus-5` (no el Tool
Runner beta — necesita auditar cada tool_use y correr sub-consultas de experto con su propio tool
set). Cada `consultar_experto_*` es una tool; Claude puede llamar varias en paralelo en el mismo
turno (`Promise.all` sobre los `tool_use` de un turno). La síntesis final sigue el formato: qué
encontramos / qué significa / qué podría faltar / fuentes con tier / confianza.

**Expertos** (`inteligencia/expertos/`, registrados en `registro-expertos.ts`): cada uno declara
`id`, `nombre`, `descripcion`, `especialidad`, `restricciones`, `riesgo`, y una función
`ejecutar(ctx, pregunta)` que devuelve un `ExpertResult` (resumen, datos, confianza, fuentes con
procedencia, advertencias, `suficiente`). El patrón es: fetch determinístico de datos reales →
(a veces) cálculo determinístico propio → UNA llamada a Claude con salida estructurada
(`llm.ts` → `interpretarComoExperto`) solo para interpretar, nunca para inventar cifras ni
fuentes. Agregar un experto nuevo es un archivo + una entrada en el registro; el orquestador no
se toca.

Once expertos:
- `presupuesto`, `deuda`, `flujo_caja`, `credito`, `tributario`, `riesgo`, `anomalias`,
  `proyeccion` (ML simple: Data Sufficiency Gate + regresión lineal sobre flujo neto propio) —
  el set original, alcance estrictamente diagnóstico/organización/seguimiento.
- `hipotecario` — financiación de vivienda: simula amortización (`inteligencia/hipotecas/
  amortizacion.ts`, sistema francés/cuota fija, abonos extraordinarios), compara contra un
  catálogo de ofertas bancarias **simulado** (`inteligencia/hipotecas/catalogo-ofertas.ts` —
  fixture ilustrativo, nunca una cotización real: no hay API bancaria de crédito hipotecario
  disponible para consumo individual, mismo criterio que ya justificó simular DIAN/DataCrédito
  en `web/src/lib/conectores/`). Cruza con la capacidad de pago real del usuario (mismas tablas
  que usan `deuda`/`flujo_caja`). Toda simulación se etiqueta explícitamente como simulación —
  nunca como preaprobación ni oferta real del banco.
- `inversiones` — perfil de inversión a nivel de portafolio (objetivo, horizonte, tolerancia al
  riesgo, liquidez, concentración/diversificación de lo que ya tiene). Lee y actualiza
  `perfil_conversacional` (la "memoria" — ver Modelo de datos) cuando el usuario declara
  objetivo/horizonte en la conversación. No es un experto de mercado: para una empresa puntual,
  el orquestador consulta también `acciones`.
- `acciones` — análisis de una empresa/ticker con datos de mercado verificables (precios,
  fundamentales, volumen). **Sin proveedor de datos conectado todavía**: el contrato vive en
  `inteligencia/mercado/proveedor.ts` (`ProveedorMercado`), `obtenerProveedorMercado()` devuelve
  `null` a propósito. Hasta que se conecte un proveedor real (ej. Alpha Vantage, Financial
  Modeling Prep — se necesita su API key), el experto responde honestamente que no tiene
  evidencia verificable en vez de fabricar un análisis.

Ningún experto nuevo cruza a asesoría regulada — ver el matiz al principio #2 en "Restricciones
importantes" más abajo.

**Trust Engine simplificado** (`inteligencia/trust/tiers.ts`): clasifica cada fuente citada en
tier A (oficial: DIAN, futuro Banrep/DANE, con procedencia observada) / B (proveedor profesional
reconocido, ej. DataCrédito/TransUnion, o dato observado del propio usuario) / C (reservado para
medios, sin uso todavía) / D (declarado por el usuario o estimado por el sistema — incluye
proyecciones y el catálogo simulado de ofertas hipotecarias). `techoConfianzaPorTiers` evita que
un experto declare confianza alta apoyado solo en una fuente tier D. Cada consulta de experto
(desde cualquiera de las dos superficies) queda auditada en `analisis` — sección 16 del pedido
original: quién preguntó, qué expertos, qué fuentes, qué confianza, qué se respondió.

**RAG mínimo** (`inteligencia/rag/`): pgvector sobre el mismo Postgres, embeddings de Voyage AI
(`VOYAGE_API_KEY`; sin ella la tool responde "no disponible" en vez de fallar). Solo para
conocimiento documental curado (`fixtures/conocimiento/*.md` → `bun run --cwd web rag:ingest`) —
regulación, definiciones de tasas, pesos vs. UVR, diversificación — nunca para datos propios del
usuario, que siempre vienen de un experto.

**Tablas nuevas** (`supabase/migrations/20260822000003_inteligencia.sql`): `conversaciones`,
`mensajes`, `perfil_conversacional` (memoria — objetivos, horizonte, tolerancia_riesgo,
preferencias; nunca cifras financieras crudas), `analisis` (auditoría), `documentos_conocimiento`
+ `documentos_conocimiento_chunks` (RAG, sin política de cliente: contenido de referencia
global, no datos de usuario).

**Tools MCP nuevas** (`mcp/src/tools/`, wrappers finos sobre `@web/lib/inteligencia/...`):
`obtener_contexto_financiero`, `obtener_perfil_credito`, `obtener_perfil_tributario`,
`buscar_transacciones`, `obtener_plan`, `calcular_riesgo_sobreendeudamiento`,
`proyectar_flujo_caja`, `buscar_conocimiento_financiero`, `simular_credito_hipotecario`,
`analizar_portafolio`, `analizar_accion` — además de `explicar_diagnostico`. Las que exponen un
experto directamente (crédito, tributario, riesgo, proyección, hipotecario, inversiones,
acciones) ejecutan la interpretación de Claude del experto en cada llamada — cuesta una llamada a
la API por invocación, deliberado: un agente externo recibe el mismo criterio ya calibrado que el
chat propio, no un volcado de JSON crudo.

Explícitamente diferido (no hay mocks permanentes fingiendo que existe): Data Discovery dinámico,
AutoML con backtesting, corroboración multi-fuente automática, cola de jobs asíncronos,
monitoreo persistente, marketplace de expertos de terceros, acciones financieras ejecutables
(Fase 1 es 100% read-only).

## Registro extendido, verificación de identidad y perfil financiero

Además del flujo original (Gmail/PDF → `Transaccion` → diagnóstico → plan), la app tiene un segundo flujo de onboarding más profundo: `/registro` → `/registro/verificar-correo` → `/registro/verificar-identidad` → `/registro/autorizacion` → `/perfil/construyendo` → `/perfil/cuentas` → `/perfil/listo` → `/panorama`. Vive en paralelo al flujo de `/intake`, no lo reemplaza.

**Identidad y consentimiento** — tablas nuevas (`supabase/migrations/20260822000002_perfil_financiero.sql`): `personas` (1:1 con `auth.users`), `empresas` (placeholder para persona jurídica, sin flujo completo todavía), `documentos_identidad` (cédula frontal/posterior, bucket privado `documentos`), `consentimientos` (append-only, 5 tipos separados — nunca un checkbox único). La verificación de identidad compara los datos escritos contra un "OCR" simulado (`web/src/lib/documentos/extractor.ts`) — no hay vendor de OCR real contratado.

**Conectores de fuentes externas** — no existen credenciales ni convenios reales con DataCrédito, TransUnion, DIAN, Colpensiones, RUNT, SIMIT, RUES, etc. Cada fuente en `web/src/lib/conectores/catalogo.ts` es un guion simulado (`web/src/lib/conectores/guiones.ts`) con datos de fixture, igual que la cuenta semilla. **Toda fuente resuelve primero el ciclo de vida de cuenta** (¿ya tiene cuenta ahí? → registro con autofill + campo faltante, o recuperar contraseña, o login directo) antes de extraer datos — ver los estados en `web/src/lib/conectores/tipos.ts` (incluye `requires_password_recovery`, que no está en el spec original de estados). El avance ocurre **al leer** (`GET /api/perfil/conexiones/estado`), sin cola de jobs ni timers de servidor. Reemplazar una fuente simulada por automatización real o una API oficial es cambiar `catalogo.ts`/`guiones.ts`, no el resto de la app.

**Normalización** — en vez de once tablas (`Income`, `Liability`, `Asset`...) hay una sola `hallazgos_financieros` con `tipo` discriminante (`TipoHallazgo` en `web/src/types/finance.ts`, junto a `Transaccion`/`Deuda`/`Plan`/`EstadoFinanciero`) y trazabilidad (`fuente`, `procedencia`, `confianza`, `periodo`). Un hallazgo nuevo nunca sobrescribe uno contradictorio de otra fuente — cada uno es su propia fila; `web/src/lib/perfil/normalizacion.ts` es quien agrega esto para el dashboard de `/panorama`, sin fundir cifras distintas en una sola.

**Fuera de alcance, documentado a propósito, no implementado:** automatización real de portales, APIs oficiales de las entidades, reconocimiento facial/biométrico, OCR real, custodia de credenciales externas (vault), rate limiting, y listado de sesiones activas por usuario (se muestra solo la sesión actual en Configuración → Privacidad — enumerarlas todas necesita el Admin API de Supabase).

## Estructura de carpetas

```
/
├── web/                        # Frente 1: Next.js app
│   └── src/
│       ├── app/                # rutas (App Router)
│       ├── components/         # componentes reutilizables
│       ├── lib/                # helpers, clientes de API, supabase
│       └── types/              # tipos TypeScript compartidos
│
├── mcp/                        # Frente 2: servidor MCP
│   └── src/
│       ├── tools/              # cada tool del servidor MCP
│       ├── lib/                # helpers compartidos con /web si aplica
│       └── index.ts            # entry point del servidor
│
├── fixtures/                   # correos y PDFs de prueba (no datos reales)
├── .env.local                  # variables de entorno (no se commitea)
└── .env.example                # plantilla de variables
```

> Si el repo tiene un solo `package.json` en la raíz (monorepo simple), ajustar rutas pero mantener la separación lógica `web/` vs `mcp/`.

---

## Import alias

- `@/*` → `web/src/*` (web app)
- `@mcp/*` → `mcp/src/*` (servidor MCP)

---

## UX — filosofía del plan

- **No hay número fijo de carriles.** El plan se genera completamente desde el contexto del usuario. Una persona puede tener 2 carriles, otra 8.
- **Los carriles son paralelos y no bloqueantes.** Si un carril está "en espera" (ej. aprobación de tarjeta), el usuario siempre tiene otros carriles activos donde avanzar.
- **Los títulos son específicos, no genéricos.** "Abonar $450.000 a Falabella el 15 de septiembre" — no "pagar tu deuda".
- **La detección automática reduce fricción.** Los pasos auto-detectables se marcan solos cuando el sistema detecta la transacción. El usuario no regresa a la app a confirmar.
- **El plan vive y evoluciona.** Si aparece un ingreso nuevo detectado en Gmail, puede generarse un carril de oportunidad que antes no existía.
- **Estilo Duolingo:** la mascota (La Hormiga Ahorradora) reacciona según el estado del usuario. Celebra logros, alerta sin culpar.

---

## Mascota

**La Hormiga Ahorradora** — marrón cálido (`#c47a3a`), ojos grandes expresivos, estilo flat design, sosteniendo una moneda dorada. Cuatro estados: feliz/motivada, concentrada, alerta, satisfecha. Aparece en transiciones, celebraciones de hitos y alertas amigables.

---

## Restricciones importantes

- La herramienta es de **diagnóstico, organización y seguimiento** — no es un asesor financiero licenciado y nunca ejecuta ni ordena ejecutar una operación financiera por el usuario.
- **Análisis vs. asesoría — actualizado con los expertos `hipotecario`, `inversiones`, `acciones` (ver "Sistema de inteligencia financiera conversacional" más abajo):** los 8 expertos originales (`presupuesto`, `deuda`, `flujo_caja`, `credito`, `tributario`, `riesgo`, `anomalias`, `proyeccion`) mantienen la regla original sin cambios — nunca tocan inversión, nunca recomiendan una entidad o producto puntual. Los tres expertos nuevos SÍ pueden analizar y comparar financiación de vivienda, composición de portafolio y renta variable, pero bajo las mismas reglas duras que ya rigen `deuda.ts`/`riesgo.ts`: ningún experto (nuevo o viejo) termina en "compra/vende esto" ni en "elige este banco/producto" como instrucción — siempre exponen evidencia → análisis → riesgo → escenarios → conclusión, con incertidumbre explícita, dejando la decisión al usuario. Una simulación de crédito hipotecario nunca se presenta como preaprobación ni oferta real del banco. Esto no convierte a Pa'lante en asesor licenciado: sigue sin ejecutar operaciones y sigue advirtiendo sus límites en cada respuesta.
- No usar datos personales reales del equipo en demos. Usar cuenta semilla de prueba.
- **Gmail no es una dependencia dura.** El parser debe funcionar con fixtures locales. Gmail es una fuente intercambiable.
- Contexto regulatorio Colombia: Decreto 0368 de 2026 estableció Finanzas Abiertas obligatorias. Estándares técnicos SFC esperados octubre 2026; entidades tienen 12 meses adicionales para implementar. Esta herramienta construye el puente mientras tanto.

---

## Estado actual del proyecto

> Verificado el 2026-08-22 contra el árbol de archivos, `tsc --noEmit`, `bun
> test` y `supabase migration list`. Si vuelves a tocar esta lista, verifica —
> un checklist desactualizado acá ya mandó una sesión entera a construir cosas
> que ya existían.

**Base**
- [x] Monorepo `web/` + `mcp/` con workspaces de Bun
- [x] Supabase Auth (Google OAuth + enlace mágico + correo/contraseña)
- [x] 6 migraciones aplicadas en remoto (`supabase migration list` sin pendientes)
- [x] `web/` y `mcp/` compilan con `tsc --noEmit` en cero errores; 21 pruebas en verde
- [ ] Prettier + Husky/lint-staged (solo ESLint hoy)

**Extracción**
- [x] 13 conectores simulados (`web/src/lib/conectores/catalogo.ts`)
- [x] Registro, verificación de identidad y consentimientos separados
- [x] Onboarding por voz con ElevenLabs (`/intake`) escribiendo hallazgos hecho a hecho
- [ ] **Parser correo/PDF → `Transaccion`: `web/src/lib/parser/index.ts` es un stub
      que devuelve `[]`.** No hay fixtures de correos/PDFs — `fixtures/` solo
      tiene los `.md` de conocimiento para el RAG
- [ ] Gmail OAuth en vivo como fuente
- [ ] Automatización real o API oficial de alguna entidad

**Normalización**
- [x] `hallazgos_financieros` con trazabilidad y sin sobrescritura
- [x] `PerfilFinancieroV1` general + vista de divulgación derivada
- [x] `cobertura` por dominio y fuente
- [ ] Deduplicación entre fuentes (`hash_dedupe`)

**Distribución**
- [x] Servidor MCP con Bearer token hasheado y bitácora de accesos
- [x] 12 tools registradas en `mcp/src/handler.ts`
- [x] API REST `/api/v1/*` con scopes por token
- [ ] Exportación completa de los datos del usuario

**Capa de demostración (expertos)** — ver "Dónde entra la capa de expertos"
- [x] Orquestador con `claude-opus-5`, streaming SSE, y 11 expertos registrados
- [x] Ledger de auditoría (`analisis`) y tiers de confianza
- [x] 7 documentos de conocimiento en `fixtures/conocimiento/`
- [ ] **RAG sin ingestar**: `bun run rag:ingest` requiere `VOYAGE_API_KEY`.
      Sin ella `buscar_conocimiento_financiero` responde "no disponible"
- [ ] **Proveedor de datos de mercado sin elegir**: `obtenerProveedorMercado()`
      devuelve `null` a propósito, así que el experto de `acciones` siempre
      responde que no tiene proveedor conectado

---

## Contratos congelados (los tres frentes construyen contra esto)

`Transaccion`, `Deuda`, `Plan`, `EstadoFinanciero`, y desde el perfil financiero extendido también `TipoHallazgo`/`ProcedenciaDato`/`HallazgoFinanciero`, viven en `src/types/finance.ts`. `EstadoFinanciero` es el contrato entre la ingesta y el MCP: quien cambie la agregación no debe tocar ninguna herramienta MCP.

Pendiente de confirmar con el equipo:
- ¿"Deuda de alto costo > 30% del ingreso" se mide sobre la **cuota mensual** (asumido hoy en `src/lib/diagnostico/reglas.ts`) o sobre el **saldo**?
- ¿De dónde sale `tasa_ea`? Los correos bancarios no la traen; probablemente la digita el usuario.
- ¿Quién llena `hash_dedupe` y con qué algoritmo?

## Notas para Claude Code

- Mantener TypeScript estricto. Sin `any` sin justificación.
- Estilos solo con Tailwind. Sin CSS inline salvo casos muy específicos.
- Antes de crear un archivo nuevo, verificar que no exista ya en la estructura.
- El `CLAUDE.md` es la fuente de verdad. Si se toma una decisión de arquitectura, actualizarlo antes de seguir.
- Los fixtures van en `/fixtures/` — nunca datos reales del equipo.
- El servidor MCP y la web app son productos distintos pero comparten el modelo de datos. No mezclar sus entry points.
- `service_role` solo en el servidor MCP y en funciones de servidor de Next.js. Nunca en componentes cliente.