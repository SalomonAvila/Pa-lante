# Proyecto: App Web con Next.js

## Contexto
Este repo es una app web nueva construida con Next.js. Este archivo resume las decisiones tomadas durante la planeación, para que cualquier sesión de Claude Code arranque con el contexto completo sin necesidad de re-explicar nada.

## Objetivo del proyecto

Herramienta que orienta a cualquier persona en el seguimiento de sus objetivos financieros, generando un plan paso a paso lo más automatizado posible.

**Problema:** el contexto financiero de una persona existe, pero está atrapado en correos de notificación bancaria y PDFs de extractos (muchos con clave). Nadie puede consultarlo de forma centralizada ni accionable.

**A quién sirve (sin excluir a ninguno, pero con un diagnóstico que decide la ruta):**
- Persona endeudada que necesita salir de deudas
- Persona que quiere organizar/entender sus finanzas desde cero (visibilidad)
- Persona con flujo positivo que quiere definir una meta de ahorro / capacidad de inversión

**Flujo general:**
1. **Ingesta de contexto financiero** — dos fuentes posibles:
   - Gmail (plan A, vía OAuth con scope restringido `gmail.readonly` o idealmente `gmail.metadata` filtrando por remitentes bancarios) → escaneo de transacciones desde correos de notificación.
   - Carga manual de PDFs (extractos, con clave típicamente la cédula) como fallback/plan B.
2. **Normalización** — correo/PDF crudo → transacción estructurada y categorizada (bancos como Bancolombia, Davivienda, Nequi, Daviplata tienen formatos distintos y descripciones "sucias", ej. `COMPRA PSE *DLO*RAPPI BOG`).
3. **Diagnóstico (router con reglas explícitas, no "la IA decidió")** — con base en el estado financiero, se enruta a una de las tres rutas:
   - Deuda de alto costo > 30% del ingreso mensual → *Salida de deudas* (priorizar mayor tasa)
   - Flujo neto negativo o > 25% del gasto sin categorizar → *Visibilidad* (entender antes de planear)
   - Flujo neto positivo y sin deuda cara → *Meta de ahorro / capacidad de inversión*
4. **Plan paso a paso** con seguimiento automatizado:
   - Diagnóstico + plan (motor principal)
   - Recordatorios (derivados de los pasos con fecha del plan)
   - Alertas de desvío (transacciones reales vs. aporte mensual planeado)
   - Proyecciones (aritmética sobre flujo neto + supuestos)
5. **Capa de acceso externo** — exponer el contexto financiero normalizado como API/MCP, para que otros agentes puedan consumirlo.

**Modelo de datos central (todo lo demás se deriva de esto):**
```
Transaccion   { fecha, monto, tipo, comercio_raw, comercio_norm,
                categoria, cuenta, fuente, confianza }

Plan          { meta, aporte_mensual, pasos[], supuestos[],
                fecha_objetivo }
```

**Restricciones importantes:**
- La herramienta es de **diagnóstico, organización y seguimiento** — NO de asesoría o recomendación de inversión (evita terreno regulado; ni el equipo ni la app son asesores licenciados).
- No usar datos personales reales de nadie del equipo en demos en vivo; usar una cuenta semilla de prueba.
- Contexto regulatorio (Colombia): el Decreto 0368 de 2026 estableció el Sistema de Finanzas Abiertas obligatorio desde abril 2026, con estándares técnicos de la SFC esperados hacia octubre 2026 y 12 meses adicionales para que las entidades habiliten el acceso. Esta herramienta busca ser un puente mientras esa infraestructura no existe.
- Gmail es "plan A" pero no debe ser una dependencia dura: el parser de transacciones debe construirse y probarse contra archivos (fixtures) exportados manualmente, de forma que Gmail sea una fuente intercambiable con "cargar archivos", no un bloqueante.

## Stack

- **Framework:** Next.js (App Router, no Pages Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Linting:** ESLint
- **Gestor de paquetes:** bun
- **Auth:** Supabase Auth (`@supabase/ssr`) — Google OAuth + Magic Link, sesión en cookies httpOnly. Reemplazó a NextAuth v5.

### Decisiones de auth (hackathon)

- Solo dos vías de entrada: **Google** y **enlace mágico por correo**. No hay registro, ni contraseñas, ni recuperación de clave — el login es también el signup.
- El botón de Google pide `gmail.readonly` en el mismo consent. Supabase deja el token de Google en `session.provider_token` (ver `src/lib/supabase/session.ts`); **vive ~1h y no se refresca solo** — si expira, se reconecta desde `/intake`. Un usuario que entró por enlace mágico simplemente no tiene Gmail conectado.
- Acceso abierto: cualquier correo puede entrar. El aislamiento de datos por usuario se hace con RLS en cualquier tabla que se agregue.
- El `service_role key` nunca va al cliente ni a `.env.example`.
- Rutas protegidas por `src/proxy.ts` (`/journey`, `/insights`, `/intake`); usa `getUser()`, no `getSession()`, porque valida el token contra Supabase.

## Estructura de carpetas objetivo

```
src/
  app/              # rutas (App Router)
    layout.tsx
    page.tsx
    globals.css
  components/       # componentes reutilizables
  lib/              # utilidades, helpers, clientes de API
  types/            # tipos TypeScript compartidos
public/             # assets estáticos
.env.local          # variables de entorno (no se commitea)
.env.example        # plantilla de variables de entorno
```

## Convenciones e import alias

- Alias de imports: `@/*` apuntando a `src/*` (default de create-next-app)

## Estado actual del proyecto

- [x] Next.js inicializado (`create-next-app`) con TypeScript, ESLint, Tailwind, App Router y `src/`
- [ ] Variables de entorno configuradas (`.env.example` creado; `.env.local` pendiente hasta que haya variables reales que definir)
- [ ] Primer commit hecho (`chore: initial Next.js setup`)
- [ ] README.md con instrucciones de instalación y scripts
- [ ] Prettier configurado (formateo consistente junto a ESLint)
- [ ] Husky + lint-staged (pre-commit hooks para lint/format)

## Próximos pasos sugeridos

1. Confirmar si falta inicializar Next.js o si ya está hecho.
2. Configurar Prettier y Husky/lint-staged si no existen.
3. Construir el parser: correo/PDF → `Transaccion` estructurada y categorizada (probado contra fixtures locales, no contra Gmail en vivo).
4. Construir `EstadoFinanciero` (ingresos, gastos por categoría, deudas, flujo neto) a partir de las transacciones.
5. Implementar el router de diagnóstico (reglas explícitas y visibles, no hardcodeadas "a ciegas") y el generador de `Plan`.
6. Derivar las 3 vistas (recordatorios, alertas de desvío, proyecciones) del mismo modelo de datos — no como módulos separados.
7. Integrar Gmail OAuth en vivo (scope restringido) como fuente intercambiable con la carga de archivos.
8. Exponer el contexto financiero normalizado como API/MCP (capa de acceso externo).
9. Definir si el proyecto necesita base de datos, autenticación u otros servicios externos, y documentarlo aquí una vez decidido.

## Notas para Claude Code

- Seguir la estructura de carpetas anterior al crear nuevos archivos.
- Mantener el código en TypeScript, usando Tailwind para estilos.
- Actualizar este archivo (`CLAUDE.md`) cuando se tomen nuevas decisiones de arquitectura o stack, para que quede como fuente de verdad del proyecto.

