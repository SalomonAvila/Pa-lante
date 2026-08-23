# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tres segmentos, sin excluir a ninguno, pero con un diagnóstico que decide la ruta:
- Persona endeudada que necesita salir de deudas.
- Persona que quiere organizar/entender sus finanzas desde cero (visibilidad), sin deuda urgente.
- Persona con flujo positivo que quiere definir una meta de ahorro / capacidad de inversión.

Situación compartida: su contexto financiero real existe, pero está disperso en correos de notificación bancaria y PDFs de extractos (a menudo protegidos con clave), y no pueden consultarlo de forma centralizada ni accionable.

## Product Purpose

Orientar a cualquier persona en el seguimiento de sus objetivos financieros, generando un plan paso a paso lo más automatizado posible: ingesta del contexto financiero (Gmail o PDF) → normalización a transacciones estructuradas → diagnóstico por reglas explícitas → plan con recordatorios, alertas de desvío y proyecciones.

## Positioning

Un diagnóstico transparente, no una caja negra: la ruta (deudas / visibilidad / ahorro) se decide con reglas explícitas y visibles, no "porque la IA lo dijo". Se posiciona como puente mientras no exista infraestructura de Finanzas Abiertas en Colombia (Decreto 0368 de 2026: sistema obligatorio desde abril 2026, estándares técnicos SFC esperados hacia octubre 2026, +12 meses para que las entidades habiliten acceso).

## Operating Context

- Ingesta por dos vías intercambiables: Gmail (OAuth de solo lectura, scope restringido `gmail.readonly`/`gmail.metadata` filtrado por remitentes bancarios) o carga manual de PDFs de extractos (típicamente protegidos con la cédula del usuario como clave).
- Bancos colombianos con formatos y descripciones "sucias" distintas entre sí (Bancolombia, Davivienda, Nequi, Daviplata; ej. `COMPRA PSE *DLO*RAPPI BOG`).
- El parser de transacciones se construye y prueba contra fixtures locales exportadas manualmente; Gmail nunca debe ser un bloqueante duro.
- Dispositivo: web, full responsive — sin sesgo declarado hacia móvil o escritorio; el flujo central (conectar cuenta, ver diagnóstico, seguir el plan) debe funcionar igual de bien en ambos.

## Capabilities and Constraints

- El diagnóstico es un router de reglas explícitas y visibles (umbrales sobre deuda de alto costo, flujo neto, gasto sin categorizar), no un modelo de caja negra.
- La herramienta es de **diagnóstico, organización y seguimiento** — nunca ejecuta una operación financiera por el usuario y nunca se presenta como asesor licenciado. Los expertos conversacionales de financiación de vivienda, portafolio y renta variable (ver CLAUDE.md, "Sistema de inteligencia financiera conversacional") pueden analizar y comparar, pero ninguno termina en una instrucción de compra/venta ni en "elige esta entidad": siempre exponen evidencia, riesgo, escenarios e incertidumbre, dejando la decisión al usuario.
- No usar datos personales reales de nadie del equipo en demos en vivo; usar una cuenta semilla de prueba.
- Modelo de datos central: `Transaccion` (fecha, monto, tipo, comercio_raw, comercio_norm, categoria, cuenta, fuente, confianza) y `Plan` (meta, aporte_mensual, pasos[], supuestos[], fecha_objetivo); recordatorios, alertas de desvío y proyecciones se derivan del mismo modelo, no son módulos separados.
- Capa de acceso externo planeada: exponer el contexto financiero normalizado como API/MCP para que otros agentes lo consuman.

## Brand Commitments

- Nombre del producto: **Pa'lante**.
- Mascota: una hormiga ilustrada (naming de assets `<accion-hormiga>.png`, ej. `hormiga-cargando-moneda.png`) que reacciona con estados emocionales (enfocada/ahorrando, alerta por desvío, feliz/satisfecha por cumplir metas) para dar feedback motivador.
- Sistema de diseño "Warm Financial Mentor": tipografía Inter, marrón cálido como color primario, superficies tonales sin sombras duras (capas + bordes suaves en vez de `box-shadow`), formas suavemente redondeadas, sin iconos-emoji (iconos propios de un solo trazo).
- Legibilidad financiera sin miedo: los montos de deuda usan un tono tierra, no el rojo de error/alerta (ese rojo queda reservado para validación y alertas de sobregasto, no para mostrar cifras de deuda).

## Identidad visual — flujo de registro y perfil financiero

El flujo de registro/verificación de identidad/conectores/panorama (`/registro`, `/perfil/*`, `/panorama`, `/configuracion/privacidad`) pivota deliberadamente hacia una estética fintech seria — bordes contenidos, tablas densas en vez de burbujas para el progreso de fuentes, jerarquía numérica sin card-en-card, mascota solo en transiciones y estados vacíos, nunca en tablas o métricas. Es un pivote acotado a este flujo, no un rediseño de "Warm Financial Mentor" en `/journey` o `/insights`, que mantienen su identidad cálida y redondeada tal como está descrita arriba. Si el pivote termina extendiéndose al resto de la app, esta sección debe actualizarse para reflejarlo antes de tocar más pantallas.

## Evidence on Hand

Ninguna todavía: no hay datos reales de usuarios, testimonios ni casos de estudio. Las demos deben usar una cuenta semilla de prueba (ver Capabilities and Constraints); nada de esto debe inventarse en trabajo futuro.

## Product Principles

1. El diagnóstico y el plan siempre se generan con reglas explícitas y visibles — nunca una caja negra de "la IA decidió".
2. El producto diagnostica, organiza y hace seguimiento — y, desde los expertos conversacionales de financiación de vivienda, portafolio y renta variable, también analiza y compara con evidencia trazable. Lo que nunca cruza es la línea de asesoría regulada: ningún experto termina en una instrucción de compra/venta ni en "elige esta entidad/producto", y ninguna simulación (ej. crédito hipotecario) se presenta como oferta real o preaprobación.
3. Gmail es una conveniencia, no una dependencia — toda funcionalidad debe operar igual de bien solo con archivos cargados manualmente.
4. La comunicación de dinero no asusta: los montos de deuda se presentan con tonos tierra, no con rojo alarmista; el tono es de mentor cálido, no de banco clínico.
5. Se diseña primero para el usuario menos cómodo con la tecnología (adultos mayores / baja alfabetización digital): lenguaje simple, alto contraste, objetivos de toque grandes, mínimos pasos.

## Accessibility & Inclusion

Confirmado con el usuario: diseñar priorizando baja alfabetización digital y usuarios mayores. Implica lenguaje simple (sin jerga financiera o técnica sin explicar), contraste alto, objetivos de toque generosos, labels siempre visibles (no solo placeholder), y flujos con el mínimo de pasos posible.
