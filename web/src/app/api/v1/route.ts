import { NextResponse } from "next/server";
import { SCOPES } from "@/lib/api/scopes";

/**
 * Raíz de descubrimiento. Pública a propósito: un desarrollador debe poder
 * ver qué existe y qué scope necesita antes de tener un token.
 */
export function GET() {
  return NextResponse.json({
    nombre: "Pa'lante API",
    version: "v1",
    descripcion:
      "Contexto financiero personal normalizado, con procedencia y confianza en cada cifra.",
    autenticacion: {
      tipo: "bearer",
      cabecera: "Authorization: Bearer <token>",
      donde_obtenerlo: "/configuracion",
    },
    scopes: SCOPES,
    recursos: [
      { metodo: "GET", ruta: "/api/v1/perfil", scope: "uno o más scopes perfil:*" },
      { metodo: "GET", ruta: "/api/v1/cobertura", scope: "cobertura:leer" },
      { metodo: "GET", ruta: "/api/v1/hallazgos", scope: "hallazgos:leer" },
      {
        metodo: "POST",
        ruta: "/api/v1/pruebas/capacidad-pago",
        scope: "prueba:generar",
      },
      { metodo: "GET", ruta: "/api/v1/exportar", scope: "exportar" },
    ],
    mcp: { url: "https://pa-lante-mcp.vercel.app/mcp", transporte: "http" },
    openapi: "/api/v1/openapi.json",
    docs: "/docs",
  });
}
