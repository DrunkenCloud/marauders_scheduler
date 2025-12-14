'use client'

import { useState } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { SessionConfig } from '@/types'
import SessionModal from './SessionModal'

interface SessionManagementProps {
  isOpen: boolean
  onClose: () => void
}

export default function SessionManagement({ isOpen, onClose }: SessionManagementProps) {
  const { sessions, currentSession, setCurrentSession, deleteSession, error } = useSession()
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [sessionModalMode, setSessionModalMode] = useState<'create' | 'edit'>('create')
  const [editingSession, setEditingSession] = useState<SessionConfig | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [copyingFromSessionId, setCopyingFromSessionId] = useState<string | null>(null)

  const handleCreateSession = () => {
    setSessionModalMode('create')
    setEditingSession(null)
    setIsSessionModalOpen(true)
  }

  const handleEditSession = (session: SessionConfig) => {
    setSessionModalMode('edit')
    setEditingSession(session)
    setIsSessionModalOpen(true)
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (sessions.length <= 1) {
      alert('Cannot delete the last session. At least one session must exist.')
      return
    }

    if (confirm('Are you sure you want to delete this session? This action cannot be undone and will delete all associated data.')) {
      setDeletingSessionId(sessionId)
      const success = await deleteSession(sessionId)
      setDeletingSessionId(null)
      
      if (!success) {
        alert('Failed to delete session. Please try again.')
      }
    }
  }

  const handleCopyFromSession = async (sourceSessionId: string) => {
    if (!currentSession) {
      alert('Please select a target session first.')
      return
    }

    if (sourceSessionId === currentSession.id) {
      alert('Cannot copy data from the same session.')
      return
    }

    const sourceSession = sessions.find(s => s.id === sourceSessionId)
    if (!sourceSession) {
      alert('Source session not found.')
      return
    }

    if (confirm(`Are you sure you want to copy all data from "${sourceSession.name}" to "${currentSession.name}"? This will overwrite existing data in the current session.`)) {
      setCopyingFromSessionId(sourceSessionId)
      
      try {
        const response = await fetch(`${basePath}/api/sessions/copy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceSessionId,
            targetSessionId: currentSession.id
          }),
        })

        const result = await response.json()

        if (result.success) {
          alert(`Successfully copied data from "${sourceSession.name}" to "${currentSession.name}".`)
        } else {
          alert(`Failed to copy session data: ${result.error?.message || 'Unknown error'}`)
        }
      } catch (err) {
        console.error('Error copying session data:', err)
        alert('Failed to copy session data. Please try again.')
      } finally {
        setCopyingFromSessionId(null)
      }
    }
  }

  const handleSwitchSession = (session: SessionConfig) => {
    setCurrentSession(session)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden border-2 border-black">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Session Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Current Session Info */}
          {currentSession && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Current Session</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-blue-900">{currentSession.name}</div>
                  <div className="text-sm text-blue-700">
                    Created: {new Date(currentSession.createdAt).toLocaleDateString()}
                  </div>
                  {currentSession.details && (
                    <div className="text-sm text-blue-600 mt-1">{currentSession.details}</div>
                  )}
                </div>
                <div className="text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={handleCreateSession}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Session</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">All Sessions</h3>
            
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📅</div>
                <p>No sessions found. Create your first session to get started.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      currentSession?.id === session.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{session.name}</h4>
                          {currentSession?.id === session.id && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Created: {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                        {session.details && (
                          <div className="text-sm text-gray-500 mt-1">{session.details}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          Created: {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Switch Session */}
                        {currentSession?.id !== session.id && (
                          <button
                            onClick={() => handleSwitchSession(session)}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                          >
                            Switch To
                          </button>
                        )}

                        {/* Copy From Session */}
                        {currentSession && currentSession.id !== session.id && (
                          <button
                            onClick={() => handleCopyFromSession(session.id)}
                            disabled={copyingFromSessionId === session.id}
                            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {copyingFromSessionId === session.id ? 'Copying...' : 'Copy From'}
                          </button>
                        )}

                        {/* Edit Session */}
                        <button
                          onClick={() => handleEditSession(session)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>

                        {/* Delete Session */}
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={deletingSessionId === session.id || sessions.length <= 1}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingSessionId === session.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Modal */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        session={editingSession}
        mode={sessionModalMode}
      />
    </div>
  )
}