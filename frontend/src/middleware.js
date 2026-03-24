import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('access_token')?.value;
  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;

  // Si no hay token y el usuario intenta acceder a rutas protegidas, redirigir a login
  if (!token && (pathname.startsWith('/admin') || pathname.startsWith('/tecnico'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si ya tiene token e intenta ir al login, redirigir a su correspondiente dashboard
  if (token && pathname === '/') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (role === 'tecnico') {
      return NextResponse.redirect(new URL('/tecnico/chat', request.url));
    }
  }

  // Protección de rutas por rol
  if (token) {
    // Si un técnico intenta entrar a /admin
    if (role === 'tecnico' && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/tecnico/chat', request.url));
    }

    // Si un admin intenta entrar a /tecnico
    if (role === 'admin' && pathname.startsWith('/tecnico')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/tecnico/:path*'],
};
