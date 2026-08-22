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

**Pa'lante es infraestructura de datos financieros personales.** No es una app
de finanzas personales.

Somos especialistas en tres cosas, en este orden:

1. **Extraer** el contexto financiero de una persona de la forma más sencilla
   posible, desde tantas fuentes como se pueda.
2. **Normalizar** todo eso a un modelo único, trazable y versionado.
3. **Distribuir** ese perfil a través de una API y un servidor MCP, para que
   cualquier agente o sistema de IA lo consuma con permiso del dueño.

**Problema central:** el contexto financiero de una persona existe, pero está
atrapado en correos, PDFs con clave y portales de entidades. Ningún sistema
puede leerlo, y menos actuarlo. Nosotros somos el habilitador.

**Qué NO somos:** no damos diagnóstico, ni plan, ni recomendación, ni asesoría.
Esas son soluciones que *otros* construyen encima de nuestros datos — y que el
propio usuario habilita conectando su agente. Si aparece la tentación de
construir el consejo dentro de Pa'lante, es señal de que nos salimos del
alcance.

**La métrica del producto es la cobertura:** qué porcentaje del contexto
financiero de una persona logramos capturar y verificar. Todo lo demás se
deriva de ahí.

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

### 3. Perfil financiero portable

`web/src/lib/perfil/perfil-financiero.ts` agrega transacciones, deudas y
hallazgos en `PerfilFinancieroV1`: el contrato canónico.

**Regla que sostiene el producto: el núcleo es general.** No contiene nada de
ningún caso de uso. Cuando aparece un caso nuevo (arriendo, crédito, subsidio,
contratación) se agrega una *vista de divulgación* derivada — nunca un campo
en el núcleo. Un caso de uso dentro del núcleo obligaría a migrar a todos los
consumidores existentes cada vez que aparece otro.

Hoy existe una sola vista: `crearPruebaCapacidadPago(perfil, objetivo)`.

### 4. Distribución

El perfil sale por dos puertas, ambas autenticadas con el mismo token del
usuario y registradas en `mcp_accesos`:

- **Servidor MCP** (`mcp/`) — para agentes de IA.
- **API REST** (`web/src/app/api/`) — para integraciones que no hablan MCP.

El usuario genera el token desde su cuenta, ve quién lo usó y lo revoca. Esa
trazabilidad no es un extra: es lo que hace aceptable mover datos financieros
personales.


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

### HallazgoFinanciero

Una sola tabla con `tipo` discriminante en vez de once tablas por dominio. Un
hallazgo nuevo **nunca sobrescribe** uno contradictorio de otra fuente: cada
uno es su propia fila, con `fuente`, `procedencia`, `confianza` y `periodo`.
Preservar la contradicción es intencional — es lo que permite mostrar de dónde
viene cada cifra y con qué respaldo.

### PerfilFinancieroV1 (calculado, no persistido)

Núcleo general: `periodo`, `ingresos`, `flujo`, `obligaciones`, `patrimonio`,
`cobertura`, `calidadDatos`. Ver `web/src/types/finance.ts`.

`cobertura` responde qué dominios están respaldados, por qué fuentes y con qué
confianza. Es la métrica de producto, no un campo secundario.


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
- Tools: `explicar_diagnostico` y `obtener_prueba_capacidad_pago` (listas). La
  segunda devuelve únicamente agregados verificables para un arriendo, nunca
  transacciones o evidencia identificable, y no toma decisiones de aprobación.
  Pendientes: `obtener_contexto_financiero`, `buscar_transacciones`,
  `obtener_plan`, `simular_escenario`.
- Con `MCP_DEMO_TOKEN` el servidor responde contra fixtures ficticios sin tocar
  Postgres: el diagnóstico usa `mcp/src/fixtures/estado-ejemplo.ts` y la prueba
  de capacidad usa `web/src/lib/perfil/fixtures/daniela.ts`. **Quitar en producción.**
- El modelo de datos NO se duplica: `mcp/tsconfig.json` mapea `@web/*` a `web/src/*`, así que los tipos de `web/src/types/finance.ts` son la única fuente de verdad para ambos frentes.

---

## Auth (decisiones de hackathon)

- **Cuenta semilla para demos: `palante.platanus@gmail.com`.** Buzón creado para la hackathon, sin correo real dentro, así que se puede entrar por enlace mágico o por Google indistintamente. Sus datos financieros son ficticios y se cargan con `supabase/seed.sql`. Nunca demostrar con la cuenta personal de nadie del equipo.

- Tres vías de entrada: **Google OAuth**, **enlace mágico por correo**, y **registro con correo + contraseña** (`/registro`). El hashing de la contraseña lo resuelve Supabase Auth (`signUp` / `signInWithPassword`) — no hay hashing propio en el código. La verificación de correo tras el registro usa `verifyOtp({ type: "signup" })` con un código de 6 dígitos, no el enlace por defecto.
- El botón de Google pide `gmail.readonly` en el mismo consent. El token de Google queda en `session.provider_token` (ver `src/lib/supabase/session.ts`). **Vive ~1h y no se refresca solo** — si expira, el usuario reconecta desde `/intake`.
- Un usuario que entró por enlace mágico no tiene Gmail conectado; puede subir PDFs.
- Aislamiento de datos por usuario con **RLS** en todas las tablas.
- El `service_role key` nunca va al cliente ni al `.env.example`.
- Rutas protegidas: `/journey`, `/insights`, `/intake`, `/panorama` y
  `/configuracion` — middleware `src/proxy.ts` usa `getUser()`, no `getSession()`.

---

## Registro extendido, verificación de identidad y perfil financiero

Además del flujo original (Gmail/PDF → `Transaccion` → diagnóstico → plan), la app tiene un segundo flujo de onboarding más profundo: `/registro` → `/registro/verificar-correo` → `/registro/verificar-identidad` → `/registro/autorizacion` → `/perfil/construyendo` → `/perfil/cuentas` → `/perfil/listo` → `/panorama`. Vive en paralelo al flujo de `/intake`, no lo reemplaza.

**Identidad y consentimiento** — tablas nuevas (`supabase/migrations/20260822000002_perfil_financiero.sql`): `personas` (1:1 con `auth.users`), `empresas` (placeholder para persona jurídica, sin flujo completo todavía), `documentos_identidad` (cédula frontal/posterior, bucket privado `documentos`), `consentimientos` (append-only, 5 tipos separados — nunca un checkbox único). La verificación de identidad compara los datos escritos contra un "OCR" simulado (`web/src/lib/documentos/extractor.ts`) — no hay vendor de OCR real contratado.

**Conectores de fuentes externas** — no existen credenciales ni convenios reales con DataCrédito, TransUnion, DIAN, Colpensiones, RUNT, SIMIT, RUES, etc. Cada fuente en `web/src/lib/conectores/catalogo.ts` es un guion simulado (`web/src/lib/conectores/guiones.ts`) con datos de fixture, igual que la cuenta semilla. **Toda fuente resuelve primero el ciclo de vida de cuenta** (¿ya tiene cuenta ahí? → registro con autofill + campo faltante, o recuperar contraseña, o login directo) antes de extraer datos — ver los estados en `web/src/lib/conectores/tipos.ts` (incluye `requires_password_recovery`, que no está en el spec original de estados). El avance ocurre **al leer** (`GET /api/perfil/conexiones/estado`), sin cola de jobs ni timers de servidor. Reemplazar una fuente simulada por automatización real o una API oficial es cambiar `catalogo.ts`/`guiones.ts`, no el resto de la app.

**Normalización** — en vez de once tablas (`Income`, `Liability`, `Asset`...) hay una sola `hallazgos_financieros` con `tipo` discriminante (`TipoHallazgo` en `web/src/types/finance.ts`, junto a `Transaccion`/`Deuda`/`Plan`/`EstadoFinanciero`) y trazabilidad (`fuente`, `procedencia`, `confianza`, `periodo`). Un hallazgo nuevo nunca sobrescribe uno contradictorio de otra fuente — cada uno es su propia fila; `web/src/lib/perfil/normalizacion.ts` es quien agrega esto para el dashboard de `/panorama`, sin fundir cifras distintas en una sola.

**Perfil portable V1** — `web/src/lib/perfil/perfil-financiero.ts` convierte
transacciones, deudas, hallazgos y una meta de `planes` en el contrato
`PerfilFinancieroV1`. La North Star del caso de demo es el porcentaje de
ingreso declarado respaldado por datos observados. Para terceros,
`PruebaCapacidadPagoV1` expone solo agregados de capacidad de arriendo, sin
cuentas, comercios, documentos o IDs de evidencia. Web y MCP deben consumir
`obtenerPerfilFinanciero()`; no pueden replicar las reglas.

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

## UX — filosofía

- **La pantalla principal es la cobertura**, no un tablero de finanzas: qué
  fuentes están conectadas, qué falta, y qué tan verificado está lo que hay.
- **Conectar una fuente es el acto central del producto.** Cada fuente nueva
  debe costarle al usuario lo mínimo posible; ahí es donde competimos.
- **Trazabilidad visible.** Toda cifra puede responder de dónde salió y con
  qué confianza. Nunca un número sin procedencia.
- **El usuario manda sobre sus datos.** Ver quién los leyó, revocar acceso y
  exportarlo todo son funciones de primera clase, no ajustes escondidos.
- Diseñar primero para el usuario menos cómodo con la tecnología: lenguaje
  simple, alto contraste, pasos mínimos.


## Mascota

**La Hormiga Ahorradora** — marrón cálido (`#c47a3a`), ojos grandes expresivos, estilo flat design, sosteniendo una moneda dorada. Cuatro estados: feliz/motivada, concentrada, alerta, satisfecha. Aparece en transiciones, celebraciones de hitos y alertas amigables.

---

## Restricciones importantes

- **Pa'lante extrae, normaliza y distribuye datos. No aconseja.** No damos diagnóstico, plan, recomendación ni asesoría financiera o de inversión. Quien consuma la API decide qué hacer con la información, y responde por ello.
- **Ningún caso de uso entra al núcleo de `PerfilFinancieroV1`.** Se agrega como vista de divulgación derivada.
- No usar datos personales reales del equipo en demos. Usar cuenta semilla de prueba.
- **Gmail no es una dependencia dura.** El parser debe funcionar con fixtures locales. Gmail es una fuente intercambiable.
- **Toda cifra expuesta lleva su procedencia y su confianza.** Un número sin respaldo no sale del sistema.
- **Todo acceso queda registrado y es revocable por el dueño.** Es lo que hace aceptable mover datos financieros personales.
- Contexto regulatorio Colombia: Decreto 0368 de 2026 estableció Finanzas Abiertas obligatorias. Estándares técnicos SFC esperados octubre 2026; entidades tienen 12 meses adicionales para implementar. Esta herramienta construye el puente mientras tanto.

---

## Estado actual del proyecto

**Extracción**
- [x] 13 conectores simulados (`web/src/lib/conectores/catalogo.ts`)
- [x] Registro, verificación de identidad y consentimientos separados
- [ ] Gmail OAuth en vivo como fuente
- [ ] Parser correo/PDF → `Transaccion` (probado contra `/fixtures/`)
- [ ] Automatización real o API oficial de alguna entidad

**Normalización**
- [x] `hallazgos_financieros` con trazabilidad y sin sobrescritura
- [x] `PerfilFinancieroV1` general + vista de divulgación derivada
- [x] `cobertura` por dominio y fuente
- [ ] Deduplicación entre fuentes (`hash_dedupe`)

**Distribución**
- [x] Servidor MCP con Bearer token hasheado y bitácora de accesos
- [x] Tools: `obtener_perfil_financiero`, `obtener_prueba_capacidad_pago`
- [ ] API REST pública versionada (`/api/v1/*`) con el mismo token
- [ ] Scopes por token (hoy un token lee todo)
- [ ] Exportación completa de los datos del usuario
- [ ] Tools pendientes: `buscar_hallazgos`, `listar_fuentes`, `cobertura`

**Retirado a propósito**
El producto de planeación (diagnóstico por rutas, plan, `/journey`,
`/insights`) se eliminó: era otro producto. Pa'lante entrega datos; el consejo
lo construye quien consuma la API.


## Contratos congelados (los tres frentes construyen contra esto)

Todo vive en `web/src/types/finance.ts` y es la única fuente de verdad; el MCP
lo importa vía el alias `@web/*` en `mcp/tsconfig.json` — **nunca se duplica**.

| Contrato | Qué es |
|---|---|
| `Transaccion`, `Deuda` | Observaciones crudas normalizadas |
| `HallazgoFinanciero` | Hallazgo de una fuente, con procedencia y confianza |
| `PerfilFinancieroV1` | **Núcleo general.** Cambiarlo obliga a migrar a todo consumidor |
| `PruebaCapacidadPagoV1` | Primera vista de divulgación derivada |
| `CoberturaPerfil` | Qué está capturado, por qué fuente, con qué confianza |

Pendiente de confirmar con el equipo:
- ¿Quién llena `hash_dedupe` y con qué algoritmo? Sin eso, una misma deuda que
  llegue por dos fuentes se cuenta dos veces.
- ¿De dónde sale `tasa_ea`? Los correos bancarios no la traen.
- ¿Qué scopes necesita un token? Hoy un token lee el perfil completo.

## Notas para Claude Code

- Mantener TypeScript estricto. Sin `any` sin justificación.
- Estilos solo con Tailwind. Sin CSS inline salvo casos muy específicos.
- Antes de crear un archivo nuevo, verificar que no exista ya en la estructura.
- El `CLAUDE.md` es la fuente de verdad. Si se toma una decisión de arquitectura, actualizarlo antes de seguir.
- Los fixtures van en `/fixtures/` — nunca datos reales del equipo.
- El servidor MCP y la web app son productos distintos pero comparten el modelo de datos. No mezclar sus entry points.
- `service_role` solo en el servidor MCP y en funciones de servidor de Next.js. Nunca en componentes cliente.
