import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy de la app.
 *
 * Comprobación optimista: si no hay cookie de sesión de Better Auth, redirige
 * al login sin tocar la base de datos. La comprobación real la hace cada página
 * con `auth.api.getSession`. El proxy nunca decide permisos.
 */

const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some(
    (name) => Boolean(request.cookies.get(name)?.value),
  );

  if (hasSession) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set(
    "next",
    request.nextUrl.pathname.startsWith("/admin")
      ? "/admin"
      : request.nextUrl.pathname,
  );

  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
