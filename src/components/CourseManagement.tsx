'use client'

import { useState } from 'react'
import { Course, ViewMode, EntityType, EntityTimetable } from '@/types'
import CourseList from './CourseList'
import CourseForm from './CourseForm'
import TimetableEditor from './TimetableEditor'
import { convertFromLegacyFormat } from '@/lib/timetable'

type CourseViewMode = ViewMode | 'timetable'

export default function CourseManagement() {
  const [viewMode, setViewMode] = useState<CourseViewMode>('list')
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

  const handleTimetableView = (course: Course) => {
    setSelectedCourse(course)
    setViewMode('timetable')
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

  const handleTimetableSave = async (timetable: EntityTimetable) => {
    if (!selectedCourse) return

    try {
      const response = await fetch('/api/timetables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'course',
          entityId: selectedCourse.id,
          sessionId: selectedCourse.session.id,
          timetable
        })
      })

      if (response.ok) {
        setViewMode('list')
        setSelectedCourse(null)
        setRefreshTrigger(prev => prev + 1)
      } else {
        throw new Error('Failed to save timetable')
      }
    } catch (error) {
      console.error('Error saving course timetable:', error)
      alert('Failed to save course timetable')
    }
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          {viewMode === 'list' ? (
            <div className="p-6">
              <CourseList
                onCourseSelect={handleCourseSelect}
                onTimetableView={handleTimetableView}
                onCreateNew={handleCreateNew}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : viewMode === 'timetable' && selectedCourse ? (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Course Timetable: {selectedCourse.code} - {selectedCourse.name}
                </h2>
                <p className="text-sm text-gray-600 mb-2">
                  View when this course is scheduled across the week
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-blue-800">
                    <span>ℹ️</span>
                    <span className="font-medium">Course Scheduling Info:</span>
                  </div>
                  <div className="mt-1 text-blue-700 space-y-1">
                    <div>• Sessions scheduled: {selectedCourse.scheduledCount || 0} / {selectedCourse.totalSessions}</div>
                    <div>• Duration: {selectedCourse.classDuration} minutes per session</div>
                    <div>• Sessions per lecture: {selectedCourse.sessionsPerLecture}</div>
                  </div>
                </div>
              </div>
              <TimetableEditor
                entityId={selectedCourse.id}
                entityType={EntityType.COURSE}
                timetable={selectedCourse.timetable ? convertFromLegacyFormat(selectedCourse.timetable, selectedCourse.id, EntityType.COURSE) : undefined}
                entityTiming={{
                  startHour: 8,
                  startMinute: 0,
                  endHour: 18,
                  endMinute: 0
                }}
                onSave={handleTimetableSave}
                onCancel={handleCancel}
                readOnly={true}
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