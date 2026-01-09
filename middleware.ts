import { NextResponse, type NextRequest } from "next/server"
import { getGroupSession } from "@/lib/utils/session"

export async function middleware(request: NextRequest) {
  // Rotas públicas (não precisam de grupo)
  const publicPaths = [
    "/",
    "/api/groups",
    "/api/groups/join",
    "/app/groups/new",
    "/app/groups/join",
  ]
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isPublicPath) {
    return NextResponse.next()
  }

  // Rotas que precisam de grupo ativo
  if (request.nextUrl.pathname.startsWith("/app")) {
    const groupId = await getGroupSession()

    if (!groupId) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/app/groups/join"
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
