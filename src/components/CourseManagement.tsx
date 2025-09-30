'use client'

import { useState } from 'react'
import { Course, ViewMode } from '@/types'
import CourseList from './CourseList'
import CourseForm from './CourseForm'

export default function CourseManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateNew = () => {
    setSelectedCourse(null)
    setViewMode('create')
  }

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course)
    setViewMode('edit')
  }

  const handleSave = () => {
    setViewMode('list')
    setSelectedCourse(null)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedCourse(null)
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          {viewMode === 'list' ? (
            <div className="p-6">
              <CourseList
                onCourseSelect={handleCourseSelect}
                onCreateNew={handleCreateNew}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : (
            <div className="p-6">
              <CourseForm
                course={viewMode === 'edit' ? selectedCourse : null}
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