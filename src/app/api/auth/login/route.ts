import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { UserRole, UserSession } from '@/types'
import { sign } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Username and password are required',
            timestamp: new Date()
          }
        },
        { status: 400 }
      )
    }

    // Hardcoded credentials as per requirements
    const validCredentials = {
      admin: { password: 'password', role: UserRole.ADMIN },
      student: { password: 'password', role: UserRole.STUDENT },
      professor: { password: 'password', role: UserRole.PROFESSOR }
    }

    const userCredentials = validCredentials[username as keyof typeof validCredentials]

    if (!userCredentials || userCredentials.password !== password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
            timestamp: new Date()
          }
        },
        { status: 401 }
      )
    }

    // Create user session
    const userSession: UserSession = {
      id: `${username}-${Date.now()}`,
      username,
      role: userCredentials.role
    }

    // Create JWT token
    const token = await sign(userSession)

    // Set secure HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return NextResponse.json({
      success: true,
      user: userSession
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          timestamp: new Date()
        }
      },
      { status: 500 }
    )
  }
}