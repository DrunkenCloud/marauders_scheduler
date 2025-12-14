'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { UserSession, UserRole } from '@/types'

interface AuthContextType {
  user: UserSession | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [user, setUser] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${basePath}/api/auth/session`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            setUser(data.user)
          }
        }
      } catch (error) {
        console.error('Session check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [basePath])

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${basePath}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        return { success: true }
      } else {
        return { success: false, error: data.error?.message || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error occurred' }
    }
  }

  const logout = async () => {
    try {
      await fetch(`${basePath}/api/auth/logout`, { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}