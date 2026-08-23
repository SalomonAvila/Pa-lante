import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// "/registro" y "/registro/verificar-correo" quedan afuera a propósito: ahí
// todavía no hay sesión (signUp sin confirmar / la página que la establece).
// "/intake" queda afuera a propósito también: la auth para el flujo de voz
// está diferida por ahora (decisión explícita), así que no puede depender de
// una sesión que todavía no existe.
const RUTAS_PROTEGIDAS = [
  "/registro/verificar-identidad",
  "/registro/autorizacion",
  "/perfil",
  "/configuracion",
  "/asistente",
];

export default async function proxy(request: NextRequest) {
  // Esta respuesta se va mutando para propagar las cookies de sesión
  // refrescadas por Supabase.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida el token contra Supabase; getSession() solo lee la cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esProtegida = RUTAS_PROTEGIDAS.some((ruta) =>
    pathname.startsWith(ruta),
  );

  if (!user && esProtegida) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/intake", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/registro/verificar-identidad/:path*",
    "/registro/autorizacion/:path*",
    "/perfil/:path*",
    "/configuracion/:path*",
    "/asistente/:path*",
  ],
};
