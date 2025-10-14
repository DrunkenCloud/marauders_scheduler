'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { Course } from '@/types'

export default function CourseScheduling() {
  const { currentSession } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  // Load courses
  useEffect(() => {
    if (!currentSession) return

    const loadCourses = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/courses?sessionId=${currentSession.id}&limit=1000`)
        const data = await response.json()
        if (data.success) {
          setCourses(data.data.courses || [])
        }
      } catch (error) {
        console.error('Error loading courses:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [currentSession])

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([])
    } else {
      setSelectedCourses(courses.map(course => course.id))
    }
  }

  const handleScheduleAll = async () => {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to schedule.')
      return
    }

    setScheduling(true)
    try {
      const response = await fetch('/api/schedule-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: currentSession?.id,
          courseIds: selectedCourses
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Request sent successfully!')
        setSelectedCourses([])
      } else {
        alert(`Failed to send request: ${data.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error sending request:', error)
      alert('Failed to send request. Please try again.')
    } finally {
      setScheduling(false)
    }
  }

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Session Selected</h2>
          <p className="text-gray-600 max-w-md">
            Please select a session to start scheduling courses.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule Courses</h1>
              <p className="text-gray-600">
                Select courses to schedule for all involved parties
              </p>
            </div>
            <div className="text-6xl">📅</div>
          </div>
        </div>

        {/* Course Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Select Courses to Schedule
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedCourses.length} selected
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedCourses.length === courses.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-gray-600">Loading courses...</div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Found</h3>
              <p className="text-gray-600">
                No courses available in this session.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
                {courses.map(course => (
                  <div
                    key={course.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCourses.includes(course.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleCourseToggle(course.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => handleCourseToggle(course.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{course.code}</h3>
                          <p className="text-sm text-gray-600">{course.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {course.scheduledCount || 0}/{course.totalSessions} scheduled
                        </div>
                        <div className="text-xs text-gray-500">
                          {course.classDuration}min sessions
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Schedule Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleScheduleAll}
                  disabled={selectedCourses.length === 0 || scheduling}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  {scheduling ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    `Schedule ${selectedCourses.length} Course${selectedCourses.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}