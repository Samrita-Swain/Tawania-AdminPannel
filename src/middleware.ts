import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Add CORS headers to all responses
  const response = NextResponse.next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Check authentication for protected routes
  const isProtectedRoute = path.startsWith('/dashboard') ||
                          path.startsWith('/products') ||
                          path.startsWith('/warehouses') ||
                          path.startsWith('/stores') ||
                          path.startsWith('/inventory') ||
                          path.startsWith('/users') ||
                          path.startsWith('/audit') ||
                          path.startsWith('/transfers');

  if (isProtectedRoute) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Redirect authenticated users away from login page
  if (path === '/auth/login') {
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    // Include auth API routes
    '/api/auth/:path*',
  ],
};
