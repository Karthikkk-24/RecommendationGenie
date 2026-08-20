import { NextResponse, type NextRequest } from 'next/server';

const publicPaths = [
  '/',
  '/about',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.includes(pathname) || pathname.startsWith('/media/');
  const hasAccess = Boolean(request.cookies.get('rg_access'));
  const hasRefresh = Boolean(request.cookies.get('rg_refresh'));
  const hasSession = hasAccess || hasRefresh;

  if (!isPublic && !hasSession && (pathname.startsWith('/app') || pathname.startsWith('/onboarding'))) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  // Only treat a live access cookie as a full session for auth pages so an
  // expired access + leftover refresh cookie cannot trap users off /login.
  if (hasAccess && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
