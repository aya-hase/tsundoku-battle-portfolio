console.log("🔥 middleware起動");
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // ★ここをgetSessionに変更
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("middleware session:", session);
  console.log("middleware path:", request.nextUrl.pathname);

  const path = request.nextUrl.pathname;
  const isProtected = ["/bookshelf", "/battle", "/payment"].some((p) =>
    path.startsWith(p),
  );

  // 未ログインなら弾く
  if (!session && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ログイン済みでloginページ来たら本棚へ
  if (session && path === "/login") {
    return NextResponse.redirect(new URL("/bookshelf", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
