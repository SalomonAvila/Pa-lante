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

Ser infraestructura de datos financieros personales: extraer el contexto financiero de una persona desde tantas fuentes como sea posible, normalizarlo a un modelo único y trazable, y distribuirlo vía API y servidor MCP para que cualquier agente o sistema de IA lo consuma con permiso del dueño. Pa'lante entrega datos; las soluciones las construye quien los consume.

## Positioning

El habilitador que le devuelve a la persona su propio contexto financiero en formato consumible por máquinas. La métrica del producto es la cobertura: qué porcentaje del contexto financiero se logra capturar y verificar. Toda cifra expuesta lleva procedencia y confianza; todo acceso queda registrado y es revocable por el dueño. Se posiciona como puente mientras no exista infraestructura de Finanzas Abiertas en Colombia (Decreto 0368 de 2026: sistema obligatorio desde abril 2026, estándares técnicos SFC esperados hacia octubre 2026, +12 meses para que las entidades habiliten acceso).

## Operating Context

- Ingesta por dos vías intercambiables: Gmail (OAuth de solo lectura, scope restringido `gmail.readonly`/`gmail.metadata` filtrado por remitentes bancarios) o carga manual de PDFs de extractos (típicamente protegidos con la cédula del usuario como clave).
- Bancos colombianos con formatos y descripciones "sucias" distintas entre sí (Bancolombia, Davivienda, Nequi, Daviplata; ej. `COMPRA PSE *DLO*RAPPI BOG`).
- El parser de transacciones se construye y prueba contra fixtures locales exportadas manualmente; Gmail nunca debe ser un bloqueante duro.
- Dispositivo: web, full responsive — sin sesgo declarado hacia móvil o escritorio; el flujo central (conectar cuenta, ver diagnóstico, seguir el plan) debe funcionar igual de bien en ambos.

## Capabilities and Constraints

- El núcleo del perfil (`PerfilFinancieroV1`) es general: ningún caso de uso vive dentro de él. Cada caso se agrega como vista de divulgación derivada.
- Pa'lante extrae, normaliza y distribuye — explícitamente NO aconseja: sin diagnóstico, sin plan, sin recomendación ni asesoría de inversión (evita terreno regulado; ni el equipo ni la app son asesores licenciados).
- No usar datos personales reales de nadie del equipo en demos en vivo; usar una cuenta semilla de prueba.
- Modelo de datos central: `Transaccion` y `HallazgoFinanciero` (observaciones con procedencia y confianza, sin sobrescritura entre fuentes) agregados en `PerfilFinancieroV1`.
- Capa de distribución: servidor MCP (listo) y API REST versionada (pendiente), ambos con token del usuario, scopes y bitácora de accesos revocable.

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

1. Toda cifra expuesta lleva su procedencia y su confianza. Un número sin respaldo no sale del sistema.
2. Nunca cruzar a asesoría: el producto extrae, normaliza y distribuye datos, punto. El consejo lo construye quien consume la API.
3. Gmail es una conveniencia, no una dependencia — toda funcionalidad debe operar igual de bien solo con archivos cargados manualmente.
4. El usuario manda sobre sus datos: ver quién accedió, revocar y exportar son funciones de primera clase, no ajustes escondidos.
5. Se diseña primero para el usuario menos cómodo con la tecnología (adultos mayores / baja alfabetización digital): lenguaje simple, alto contraste, objetivos de toque grandes, mínimos pasos.

## Accessibility & Inclusion

Confirmado con el usuario: diseñar priorizando baja alfabetización digital y usuarios mayores. Implica lenguaje simple (sin jerga financiera o técnica sin explicar), contraste alto, objetivos de toque generosos, labels siempre visibles (no solo placeholder), y flujos con el mínimo de pasos posible.
