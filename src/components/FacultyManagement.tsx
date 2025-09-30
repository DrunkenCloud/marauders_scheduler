'use client'

import { useState } from 'react'
import { Faculty, ViewMode } from '@/types'
import FacultyList from './FacultyList'
import FacultyForm from './FacultyForm'

export default function FacultyManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateNew = () => {
    setSelectedFaculty(null)
    setViewMode('create')
  }

  const handleFacultySelect = (faculty: Faculty) => {
    setSelectedFaculty(faculty)
    setViewMode('edit')
  }

  const handleSave = () => {
    setViewMode('list')
    setSelectedFaculty(null)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedFaculty(null)
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          {viewMode === 'list' ? (
            <div className="p-6">
              <FacultyList
                onFacultySelect={handleFacultySelect}
                onCreateNew={handleCreateNew}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : (
            <div className="p-6">
              <FacultyForm
                faculty={viewMode === 'edit' ? selectedFaculty : null}
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