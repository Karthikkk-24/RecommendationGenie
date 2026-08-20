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
  const hasSession = Boolean(request.cookies.get('rg_access') ?? request.cookies.get('rg_refresh'));

  if (!isPublic && !hasSession && (pathname.startsWith('/app') || pathname.startsWith('/onboarding'))) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (hasSession && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
