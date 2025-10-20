'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { Course } from '@/types'

interface CourseSchedulingConfig {
  courseId: string
  sessionsToSchedule: number
}

export default function CourseScheduling() {
  const { currentSession } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [courseConfigs, setCourseConfigs] = useState<{ [courseId: string]: CourseSchedulingConfig }>({})
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
    setSelectedCourses(prev => {
      const isCurrentlySelected = prev.includes(courseId)
      
      if (isCurrentlySelected) {
        // Remove from selection and config
        const newConfigs = { ...courseConfigs }
        delete newConfigs[courseId]
        setCourseConfigs(newConfigs)
        return prev.filter(id => id !== courseId)
      } else {
        // Add to selection and initialize config
        const course = courses.find(c => c.id === courseId)
        if (course) {
          const remainingSessions = course.totalSessions - (course.scheduledCount || 0)
          setCourseConfigs(prev => ({
            ...prev,
            [courseId]: {
              courseId,
              sessionsToSchedule: Math.min(1, remainingSessions)
            }
          }))
        }
        return [...prev, courseId]
      }
    })
  }

  const handleSessionsChange = (courseId: string, sessions: number) => {
    setCourseConfigs(prev => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        sessionsToSchedule: sessions
      }
    }))
  }

  const handleSelectAll = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([])
      setCourseConfigs({})
    } else {
      const newConfigs: { [courseId: string]: CourseSchedulingConfig } = {}
      courses.forEach(course => {
        const remainingSessions = course.totalSessions - (course.scheduledCount || 0)
        if (remainingSessions > 0) {
          newConfigs[course.id] = {
            courseId: course.id,
            sessionsToSchedule: Math.min(1, remainingSessions)
          }
        }
      })
      setCourseConfigs(newConfigs)
      setSelectedCourses(courses.filter(course => {
        const remainingSessions = course.totalSessions - (course.scheduledCount || 0)
        return remainingSessions > 0
      }).map(course => course.id))
    }
  }

  const handleScheduleAll = async () => {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to schedule.')
      return
    }

    // Validate that all selected courses have valid session counts
    const invalidCourses = selectedCourses.filter(courseId => {
      const config = courseConfigs[courseId]
      return !config || config.sessionsToSchedule <= 0
    })

    if (invalidCourses.length > 0) {
      alert('Please set valid session counts for all selected courses.')
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
          courseConfigs: selectedCourses.map(courseId => courseConfigs[courseId])
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`Scheduling completed! ${data.message}`)
        setSelectedCourses([])
        setCourseConfigs({})
        // Reload courses to show updated scheduled counts
        const coursesResponse = await fetch(`/api/courses?sessionId=${currentSession?.id}&limit=1000`)
        const coursesData = await coursesResponse.json()
        if (coursesData.success) {
          setCourses(coursesData.data.courses || [])
        }
      } else {
        alert(`Scheduling failed: ${data.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error scheduling courses:', error)
      alert('Failed to schedule courses. Please try again.')
    } finally {
      setScheduling(false)
    }
  }

  const getTotalSessionsToSchedule = () => {
    return selectedCourses.reduce((total, courseId) => {
      const config = courseConfigs[courseId]
      return total + (config?.sessionsToSchedule || 0)
    }, 0)
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
              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                {courses.map(course => {
                  const isSelected = selectedCourses.includes(course.id)
                  const remainingSessions = course.totalSessions - (course.scheduledCount || 0)
                  const config = courseConfigs[course.id]
                  const isFullyScheduled = remainingSessions <= 0

                  return (
                    <div
                      key={course.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        isFullyScheduled
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isFullyScheduled}
                            onChange={() => handleCourseToggle(course.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1 disabled:opacity-50"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{course.code}</h3>
                              {isFullyScheduled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Fully Scheduled
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{course.name}</p>
                            
                            {/* Session Slider - Only show when selected */}
                            {isSelected && !isFullyScheduled && (
                              <div className="mt-3 p-3 bg-white rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Sessions to schedule:
                                  </label>
                                  <span className="text-sm font-semibold text-blue-600">
                                    {config?.sessionsToSchedule || 0} of {remainingSessions} remaining
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs text-gray-500">1</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max={remainingSessions}
                                    value={config?.sessionsToSchedule || 1}
                                    onChange={(e) => handleSessionsChange(course.id, parseInt(e.target.value))}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((config?.sessionsToSchedule || 1) / remainingSessions) * 100}%, #e5e7eb ${((config?.sessionsToSchedule || 1) / remainingSessions) * 100}%, #e5e7eb 100%)`
                                    }}
                                  />
                                  <span className="text-xs text-gray-500">{remainingSessions}</span>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  Total duration: {((config?.sessionsToSchedule || 0) * course.classDuration)} minutes
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {course.scheduledCount || 0}/{course.totalSessions} scheduled
                          </div>
                          <div className="text-xs text-gray-500">
                            {course.classDuration}min sessions
                          </div>
                          {remainingSessions > 0 && (
                            <div className="text-xs text-orange-600 mt-1">
                              {remainingSessions} remaining
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Schedule Button */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedCourses.length > 0 && (
                    <>
                      <span className="font-medium">{selectedCourses.length}</span> course{selectedCourses.length !== 1 ? 's' : ''} selected • 
                      <span className="font-medium text-blue-600 ml-1">{getTotalSessionsToSchedule()}</span> session{getTotalSessionsToSchedule() !== 1 ? 's' : ''} to schedule
                    </>
                  )}
                </div>
                <button
                  onClick={handleScheduleAll}
                  disabled={selectedCourses.length === 0 || scheduling || getTotalSessionsToSchedule() === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  {scheduling ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Scheduling...
                    </div>
                  ) : (
                    `Schedule ${getTotalSessionsToSchedule()} Session${getTotalSessionsToSchedule() !== 1 ? 's' : ''}`
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