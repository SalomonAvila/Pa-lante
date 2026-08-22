# Proyecto: Finanzas personales — web app + servidor MCP

Este archivo es la fuente de verdad del proyecto. Toda sesión de Claude Code debe leerlo completo antes de tocar cualquier archivo.

---


## Los dos frentes

Este proyecto tiene **dos productos distintos que comparten el mismo modelo de datos**:

| Frente | Qué es | Quién lo usa |
|--------|--------|--------------|
| **Web app** (Next.js) | Interfaz donde el usuario conecta sus datos, ve su diagnóstico y sigue su plan financiero personalizado | El usuario final |
| **Servidor MCP** | Expone el contexto financiero normalizado del usuario como herramientas consumibles por agentes de IA externos | Otros agentes, integraciones, demos del track Access |

Ambos frentes leen del mismo modelo de datos (Supabase). El MCP no tiene UI — solo expone tools con el contexto ya procesado.

---

## Objetivo del producto

Herramienta que convierte el contexto financiero disperso de una persona (correos bancarios, PDFs de extractos) en un **plan financiero personalizado, dinámico y con seguimiento automático**.

**Problema central:** el contexto financiero de una persona existe, pero está atrapado en 200 correos y 12 PDFs con clave. Ningún sistema puede leerlo ni actuarlo.

**A quién sirve:** cualquier persona, sin importar su situación. El diagnóstico decide automáticamente su ruta:
- Persona endeudada → ruta *Salida de deudas*
- Persona con flujo negativo o gasto sin categorizar → ruta *Visibilidad*
- Persona con flujo positivo sin deuda cara → ruta *Meta de ahorro / capacidad de inversión*

---

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

- La herramienta es de **diagnóstico, organización y seguimiento** — NOT de asesoría de inversión. No recomienda productos financieros específicos.
- No usar datos personales reales del equipo en demos. Usar cuenta semilla de prueba.
- **Gmail no es una dependencia dura.** El parser debe funcionar con fixtures locales. Gmail es una fuente intercambiable.
- Contexto regulatorio Colombia: Decreto 0368 de 2026 estableció Finanzas Abiertas obligatorias. Estándares técnicos SFC esperados octubre 2026; entidades tienen 12 meses adicionales para implementar. Esta herramienta construye el puente mientras tanto.

---

## Estado actual del proyecto

- [x] Next.js inicializado con TypeScript, ESLint, Tailwind, App Router y `src/`
- [x] Supabase Auth configurado (Google OAuth + Magic Link)
- [ ] `.env.local` configurado con variables reales
- [ ] Primer commit limpio hecho
- [ ] Prettier + Husky/lint-staged configurados
- [ ] Estructura de carpetas `web/` y `mcp/` creada (monorepo con workspaces de Bun, `mcp/` con un tool de ejemplo `get_transacciones`)
- [ ] Parser: correo/PDF → `Transaccion` (testeado con fixtures)
- [ ] `EstadoFinanciero` calculado desde transacciones
- [ ] Router de diagnóstico (umbrales explícitos en código)
- [ ] Motor de generación de plan (prompt → `NodoPlan[]`)
- [ ] UI de carriles paralelos (web)
- [ ] Servidor MCP con tools sobre el contexto normalizado
- [ ] Gmail OAuth en vivo como fuente intercambiable
- [ ] Integración Belvo/Finerio (opcional, post-MVP)

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