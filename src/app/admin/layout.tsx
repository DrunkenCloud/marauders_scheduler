'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useSession } from '@/contexts/SessionContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import SessionSelector from '@/components/SessionSelector'
import StatsCards from '@/components/StatsCards'
import SessionModal from '@/components/SessionModal'
import SessionManagement from '@/components/SessionManagement'
import { EntityType, SessionConfig } from '@/types'
import { useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading: authLoading } = useAuth()
  const { currentSession, error: sessionError } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [sessionModalMode, setSessionModalMode] = useState<'create' | 'edit'>('create')
  const [editingSession, setEditingSession] = useState<SessionConfig | null>(null)
  const [isSessionManagementOpen, setIsSessionManagementOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleCreateSession = () => {
    setSessionModalMode('create')
    setEditingSession(null)
    setIsSessionModalOpen(true)
  }

  const handleCopyFromSession = (sourceSession: SessionConfig) => {
    setIsSessionManagementOpen(true)
  }

  const handleManageSessions = () => {
    setIsSessionManagementOpen(true)
  }

  const getActiveEntity = (): EntityType | 'import-export' | null => {
    if (pathname.includes('/students')) return EntityType.STUDENT
    if (pathname.includes('/faculty')) return EntityType.FACULTY
    if (pathname.includes('/halls')) return EntityType.HALL
    if (pathname.includes('/courses')) return EntityType.COURSE
    if (pathname.includes('/student-groups')) return EntityType.STUDENT_GROUP
    if (pathname.includes('/faculty-groups')) return EntityType.FACULTY_GROUP
    if (pathname.includes('/hall-groups')) return EntityType.HALL_GROUP
    if (pathname.includes('/schedule-courses')) return EntityType.SCHEDULE_COURSES
    if (pathname.includes('/import-export')) return 'import-export'
    return null
  }

  const handleEntitySelect = (entityType: EntityType | 'import-export') => {
    if (entityType === 'import-export') {
      router.push('/admin/import-export')
      return
    }
    
    const routes: Record<EntityType, string> = {
      [EntityType.STUDENT]: '/admin/students',
      [EntityType.FACULTY]: '/admin/faculty',
      [EntityType.HALL]: '/admin/halls',
      [EntityType.COURSE]: '/admin/courses',
      [EntityType.STUDENT_GROUP]: '/admin/student-groups',
      [EntityType.FACULTY_GROUP]: '/admin/faculty-groups',
      [EntityType.HALL_GROUP]: '/admin/hall-groups',
      [EntityType.SCHEDULE_COURSES]: '/admin/schedule-courses'
    }
    router.push(routes[entityType])
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                College Schedule Maker
              </h1>
              <div className="hidden sm:block text-sm text-gray-500">
                Admin Dashboard
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <SessionSelector 
                onCreateSession={handleCreateSession}
                onCopyFromSession={handleCopyFromSession}
                onManageSessions={handleManageSessions}
              />
              
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <span>Welcome, {user.username}</span>
                <span className="text-gray-400">({user.role})</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Session Error Display */}
      {sessionError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{sessionError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <Sidebar 
          activeEntity={getActiveEntity()}
          onEntitySelect={handleEntitySelect}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Stats Cards */}
          {currentSession && (
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Dashboard Overview</h2>
                <p className="text-sm text-gray-600">
                  Quick statistics for session: {currentSession.name}
                </p>
              </div>
              <StatsCards />
            </div>
          )}

          {/* Entity Content Area */}
          {children}
        </div>
      </div>

      {/* Session Modal */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        session={editingSession}
        mode={sessionModalMode}
      />

      {/* Session Management */}
      <SessionManagement
        isOpen={isSessionManagementOpen}
        onClose={() => setIsSessionManagementOpen(false)}
      />
    </div>
  )
}
