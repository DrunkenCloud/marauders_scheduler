import { cookies } from 'next/headers'
import { verify } from '@/lib/jwt'
import { UserSession, UserRole } from '@/types'

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    return await verify(token)
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<UserSession> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }

  return user
}

export async function requireAdmin(): Promise<UserSession> {
  return requireAuth([UserRole.ADMIN])
}

// Utility to get user from request headers (set by middleware)
export function getUserFromHeaders(headers: Headers): UserSession | null {
  try {
    const userId = headers.get('x-user-id')
    const userRole = headers.get('x-user-role') as UserRole
    const username = headers.get('x-username')

    if (!userId || !userRole || !username) {
      return null
    }

    return {
      id: userId,
      role: userRole,
      username
    }
  } catch (error) {
    console.error('Get user from headers error:', error)
    return null
  }
}