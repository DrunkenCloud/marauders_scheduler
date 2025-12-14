'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Student, ViewMode, EntityType } from '@/types'
import StudentList from './StudentList'
import StudentForm from './StudentForm'
import TimetableManagement from './TimetableManagement'

type ExtendedViewMode = ViewMode | 'timetable'

export default function StudentManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [viewMode, setViewMode] = useState<ExtendedViewMode>('list')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load state from URL on mount
  useEffect(() => {
    const mode = searchParams.get('mode') as ExtendedViewMode
    const studentId = searchParams.get('studentId')
    
    if (mode && ['list', 'create', 'edit', 'timetable'].includes(mode)) {
      setViewMode(mode)
      
      if (studentId && (mode === 'edit' || mode === 'timetable')) {
        // Load student data
        fetch(`${basePath}/api/students/${studentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              setSelectedStudent(data.data)
            }
          })
          .catch(err => console.error('Error loading student:', err))
      }
    }
  }, [searchParams, basePath])

  const updateURL = (mode: ExtendedViewMode, studentId?: string) => {
    const params = new URLSearchParams()
    params.set('mode', mode)
    if (studentId) params.set('studentId', studentId)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleCreateNew = () => {
    setSelectedStudent(null)
    setViewMode('create')
    updateURL('create')
  }

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student)
    setViewMode('edit')
    updateURL('edit', student.id)
  }

  const handleSave = () => {
    setViewMode('list')
    setSelectedStudent(null)
    setRefreshTrigger(prev => prev + 1)
    updateURL('list')
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedStudent(null)
    updateURL('list')
  }

  const handleManageTimetable = (student: Student) => {
    setSelectedStudent(student)
    setViewMode('timetable')
    updateURL('timetable', student.id)
  }

  const handleBackFromTimetable = () => {
    setViewMode('list')
    setSelectedStudent(null)
    updateURL('list')
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          {viewMode === 'list' ? (
            <div className="p-6">
              <StudentList
                onStudentSelect={handleStudentSelect}
                onCreateNew={handleCreateNew}
                onManageTimetable={handleManageTimetable}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : viewMode === 'timetable' ? (
            <TimetableManagement
              entityId={selectedStudent?.id || ''}
              entityType={EntityType.STUDENT}
              entityName={`Student ${selectedStudent?.digitalId}`}
              onBack={handleBackFromTimetable}
            />
          ) : (
            <div className="p-6">
              <StudentForm
                student={viewMode === 'edit' ? selectedStudent : null}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}