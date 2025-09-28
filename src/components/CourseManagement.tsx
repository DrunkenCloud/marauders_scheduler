'use client'

import { useState } from 'react'
import CourseList from './CourseList'
import CourseForm from './CourseForm'

interface Course {
  id: number
  name: string
  code: string
  classDuration: number
  sessionsPerLecture: number
  totalSessions: number
  timetable: any
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  compulsoryFaculties: Array<{
    id: number
    name: string
    shortForm: string | null
  }>
  compulsoryHalls: Array<{
    id: number
    name: string
    Building: string
    Floor: string
    shortForm: string | null
  }>
  studentEnrollments: Array<{
    student: {
      id: number
      digitalId: number
    }
  }>
  studentGroupEnrollments: Array<{
    studentGroup: {
      id: number
      groupName: string
    }
  }>
}

type ViewMode = 'list' | 'create' | 'edit'

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