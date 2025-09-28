import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token found',
          timestamp: new Date()
        }
      }, { status: 401 })
    }

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

    return NextResponse.json({
      success: true,
      user: userSession
    })

  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        timestamp: new Date()
      }
    }, { status: 500 })
  }
}