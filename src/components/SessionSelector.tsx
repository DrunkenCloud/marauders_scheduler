'use client'

import { useState } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { SessionConfig } from '@/types'

interface SessionSelectorProps {
  onCreateSession?: () => void
  onCopyFromSession?: (sourceSession: SessionConfig) => void
  onManageSessions?: () => void
}

export default function SessionSelector({ onCreateSession, onCopyFromSession, onManageSessions }: SessionSelectorProps) {
  const { currentSession, sessions, setCurrentSession, isLoading } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const handleSessionSelect = (session: SessionConfig) => {
    setCurrentSession(session)
    setIsOpen(false)
  }

  const handleCreateSession = () => {
    setIsOpen(false)
    onCreateSession?.()
  }

  const handleManageSessions = () => {
    setIsOpen(false)
    onManageSessions?.()
  }

  const handleCopyFromSession = (sourceSession: SessionConfig) => {
    setIsOpen(false)
    onCopyFromSession?.(sourceSession)
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading sessions...</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Current Session:</span>
          <span className="text-sm text-gray-900">
            {currentSession ? currentSession.name : 'No session selected'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* Current Session Info */}
            {currentSession && (
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">{currentSession.name}</div>
                <div className="text-xs text-gray-500">
                  {currentSession.startTime} - {currentSession.endTime}
                </div>
                {currentSession.details && (
                  <div className="text-xs text-gray-500 mt-1">{currentSession.details}</div>
                )}
              </div>
            )}

            {/* Session List */}
            <div className="max-h-60 overflow-y-auto">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="group">
                    <button
                      onClick={() => handleSessionSelect(session)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between ${
                        currentSession?.id === session.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{session.name}</div>
                        <div className="text-xs text-gray-500">
                          {session.startTime} - {session.endTime}
                        </div>
                      </div>
                      {currentSession?.id === session.id && (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    
                    {/* Copy from session option */}
                    {currentSession?.id !== session.id && onCopyFromSession && (
                      <button
                        onClick={() => handleCopyFromSession(session)}
                        className="w-full text-left px-8 py-1 text-xs text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        📋 Copy data from this session
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No sessions available
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 py-1">
              {onCreateSession && (
                <button
                  onClick={handleCreateSession}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New Session</span>
                </button>
              )}
              
              {onManageSessions && (
                <button
                  onClick={handleManageSessions}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Manage All Sessions</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}