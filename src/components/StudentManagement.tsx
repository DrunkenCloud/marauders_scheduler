'use client'

import { useState } from 'react'
import { Student, ViewMode } from '@/types'
import StudentList from './StudentList'
import StudentForm from './StudentForm'

export default function StudentManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateNew = () => {
    setSelectedStudent(null)
    setViewMode('create')
  }

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student)
    setViewMode('edit')
  }

  const handleSave = () => {
    setViewMode('list')
    setSelectedStudent(null)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedStudent(null)
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
                refreshTrigger={refreshTrigger}
              />
            </div>
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