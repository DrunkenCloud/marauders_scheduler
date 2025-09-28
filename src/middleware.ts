import { NextRequest, NextResponse } from 'next/server'
import { verify } from '@/lib/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth/login']
  
  // Check if the current path is public
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // For admin routes, check authentication
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const userSession = await verify(token)
      
      if (!userSession) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Check if user has admin role for admin routes
      if (userSession.role !== 'admin') {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      return NextResponse.next()
    } catch (error) {
      console.error('Middleware auth error:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // For API routes that require authentication
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date()
        }
      }, { status: 401 })
    }

    try {
      const userSession = await verify(token)
      
      if (!userSession) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            timestamp: new Date()
          }
        }, { status: 401 })
      }

      // Add user info to request headers for API routes
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', userSession.id)
      requestHeaders.set('x-user-role', userSession.role)
      requestHeaders.set('x-username', userSession.username)

      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
    } catch (error) {
      console.error('API middleware auth error:', error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication error',
          timestamp: new Date()
        }
      }, { status: 500 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}