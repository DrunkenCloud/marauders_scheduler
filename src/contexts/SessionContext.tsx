'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SessionConfig, ApiResponse } from '@/types'

interface SessionContextType {
  currentSession: SessionConfig | null
  sessions: SessionConfig[]
  isLoading: boolean
  error: string | null
  setCurrentSession: (session: SessionConfig) => void
  refreshSessions: () => Promise<void>
  createSession: (sessionData: Partial<SessionConfig>) => Promise<SessionConfig | null>
  updateSession: (id: string, sessionData: Partial<SessionConfig>) => Promise<SessionConfig | null>
  deleteSession: (id: string) => Promise<boolean>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<SessionConfig | null>(null)
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [sessions, setSessions] = useState<SessionConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshSessions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`${basePath}/api/sessions`)
      const result: ApiResponse<SessionConfig[]> = await response.json()
      
      if (result.success && result.data) {
        setSessions(result.data)
        
        // Set current session to the first one if none is selected
        if (!currentSession && result.data.length > 0) {
          setCurrentSession(result.data[0])
        }
      } else {
        setError(result.error?.message || 'Failed to fetch sessions')
      }
    } catch (err) {
      setError('Failed to fetch sessions')
      console.error('Error fetching sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createSession = async (sessionData: Partial<SessionConfig>): Promise<SessionConfig | null> => {
    try {
      setError(null)
      
      const response = await fetch(`${basePath}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })
      
      const result: ApiResponse<SessionConfig> = await response.json()
      
      if (result.success && result.data) {
        await refreshSessions()
        return result.data
      } else {
        setError(result.error?.message || 'Failed to create session')
        return null
      }
    } catch (err) {
      setError('Failed to create session')
      console.error('Error creating session:', err)
      return null
    }
  }

  const updateSession = async (id: string, sessionData: Partial<SessionConfig>): Promise<SessionConfig | null> => {
    try {
      setError(null)
      
      const response = await fetch(`${basePath}/api/sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })
      
      const result: ApiResponse<SessionConfig> = await response.json()
      
      if (result.success && result.data) {
        await refreshSessions()
        
        // Update current session if it was the one being updated
        if (currentSession?.id === id) {
          setCurrentSession(result.data)
        }
        
        return result.data
      } else {
        setError(result.error?.message || 'Failed to update session')
        return null
      }
    } catch (err) {
      setError('Failed to update session')
      console.error('Error updating session:', err)
      return null
    }
  }

  const deleteSession = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch(`${basePath}/api/sessions/${id}`, {
        method: 'DELETE',
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.success) {
        await refreshSessions()
        
        // If the deleted session was the current one, switch to another
        if (currentSession?.id === id) {
          const remainingSessions = sessions.filter(s => s.id !== id)
          setCurrentSession(remainingSessions.length > 0 ? remainingSessions[0] : null)
        }
        
        return true
      } else {
        setError(result.error?.message || 'Failed to delete session')
        return false
      }
    } catch (err) {
      setError('Failed to delete session')
      console.error('Error deleting session:', err)
      return false
    }
  }

  useEffect(() => {
    refreshSessions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value: SessionContextType = {
    currentSession,
    sessions,
    isLoading,
    error,
    setCurrentSession,
    refreshSessions,
    createSession,
    updateSession,
    deleteSession,
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}