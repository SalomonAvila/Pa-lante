# Pa'lante

El contexto financiero de una persona existe, pero está atrapado en correos de notificación bancaria, PDFs con clave y portales de entidades (DIAN, DataCrédito, Colpensiones...). Ningún sistema puede leerlo, y menos actuarlo. **Pa'lante es infraestructura de datos financieros personales**: extrae ese contexto, lo normaliza y lo distribuye con permiso del dueño.

## Los tres pasos del núcleo

1. **Extracción** — Gmail (notificaciones bancarias), PDFs subidos a mano, DIAN (RUT, exógena, declaración de renta) y DataCrédito ya con parsers reales; más de una decena de fuentes adicionales (Colpensiones, RUNT, SIMIT, RUES...) simuladas con el mismo contrato, listas para reemplazar por la API oficial el día que exista.
2. **Normalización** — todo hallazgo (ingreso, deuda, activo, propiedad...) cae en un modelo único con trazabilidad: de qué fuente vino, con qué confianza, y nunca sobrescribe uno contradictorio de otra fuente. Se calcula un perfil financiero versionado (`PerfilFinancieroV1`) con su vista de cobertura — qué porcentaje del contexto de la persona logramos capturar y verificar, que es la métrica del producto.
3. **Distribución** — el perfil se expone por API REST (`/api/v1/*`, con scopes por token) y por un **servidor MCP** con autenticación por Bearer token propio (hasheado, nunca en claro) y bitácora de accesos: el usuario ve quién leyó su contexto y puede revocarlo en cualquier momento.

## Identidad y seguridad

Registro con verificación de identidad y consentimientos granulares separados por finalidad y por fuente (nunca un checkbox único). Los campos más sensibles de identidad viven cifrados (AES-256-GCM) con una clave fuera de la base, y la cédula se busca por un hash seudonimizado (HMAC), nunca en claro — el espacio de búsqueda de una cédula es pequeño para hashearla a secas.

## La capa de demostración

Un onboarding conversacional por voz (ElevenLabs) recolecta el contexto financiero mientras la persona simplemente cuenta su situación — sin formularios, con un checklist interno que decide la siguiente pregunta y nunca repite lo que ya sabe. Al terminar, once expertos (presupuesto, deudas, flujo de caja, crédito, tributario, riesgo, anomalías, proyección, hipotecario, inversiones, acciones) corren en paralelo y sintetizan una respuesta citando procedencia y nivel de confianza — nunca una cifra o fuente inventada.

Esta capa **no es el producto**: es la prueba de lo que cualquier agente externo ya puede construir sobre el MCP, con el mismo criterio calibrado y el mismo control de acceso que ve el dueño de los datos. Quitarla debe dejar el núcleo en pie.

Pa'lante es una herramienta de diagnóstico, organización y seguimiento — no un asesor financiero licenciado, y nunca ejecuta una operación financiera por el usuario.

Construido pensando en Colombia, como puente mientras se implementa el Sistema de Finanzas Abiertas (Decreto 0368 de 2026).
