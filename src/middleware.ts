import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protect all /admin routes except /admin/login
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login');
  
  if (isAdminPath) {
    const sessionCookie = request.cookies.get('admin_session');
    
    // If no valid session cookie, redirect to login
    if (!sessionCookie || sessionCookie.value !== 'true') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
