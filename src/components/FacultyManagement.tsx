'use client'

import { useState } from 'react'
import { Faculty, ViewMode, EntityType } from '@/types'
import FacultyList from './FacultyList'
import FacultyForm from './FacultyForm'
import TimetableManagement from './TimetableManagement'

type ExtendedViewMode = ViewMode | 'timetable'

export default function FacultyManagement() {
  const [viewMode, setViewMode] = useState<ExtendedViewMode>('list')
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

  const handleManageTimetable = (faculty: Faculty) => {
    setSelectedFaculty(faculty)
    setViewMode('timetable')
  }

  const handleBackFromTimetable = () => {
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
                onManageTimetable={handleManageTimetable}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : viewMode === 'timetable' ? (
            <TimetableManagement
              entityId={selectedFaculty?.id || 0}
              entityType={EntityType.FACULTY}
              entityName={selectedFaculty?.name}
              onBack={handleBackFromTimetable}
            />
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