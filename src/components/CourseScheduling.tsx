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
  const [randomSeed, setRandomSeed] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduledSlots, setScheduledSlots] = useState<any[]>([])
  const [schedulingResult, setSchedulingResult] = useState<any>(null)
  const [committing, setCommitting] = useState(false)

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
      const requestBody: any = {
        sessionId: currentSession?.id,
        courseConfigs: selectedCourses.map(courseId => courseConfigs[courseId])
      }

      // Add random seed if provided
      if (randomSeed.trim() !== '') {
        const seedNumber = parseInt(randomSeed.trim())
        if (!isNaN(seedNumber)) {
          requestBody.randomSeed = seedNumber
        }
      }

      const response = await fetch('/api/schedule-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        // Store the scheduling results for preview
        setScheduledSlots(data.data.scheduledSlots || [])
        setSchedulingResult(data.data)
        alert(`Scheduling preview ready! Found ${data.data.scheduledSlots?.length || 0} sessions to schedule.`)
      } else {
        alert(`Scheduling failed: ${data.error?.message || 'Unknown error'}`)
        setScheduledSlots([])
        setSchedulingResult(null)
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

  const handleCommitSchedule = async () => {
    if (!scheduledSlots.length || !currentSession) {
      alert('No scheduled slots to commit.')
      return
    }

    setCommitting(true)
    try {
      const response = await fetch('/api/schedule-all/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          scheduledSlots: scheduledSlots
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`Successfully committed ${scheduledSlots.length} scheduled sessions to the database!`)

        // Clear the preview
        setScheduledSlots([])
        setSchedulingResult(null)
        setSelectedCourses([])
        setCourseConfigs({})

        // Reload courses to show updated scheduled counts
        const coursesResponse = await fetch(`/api/courses?sessionId=${currentSession.id}&limit=1000`)
        const coursesData = await coursesResponse.json()
        if (coursesData.success) {
          setCourses(coursesData.data.courses || [])
        }
      } else {
        alert(`Failed to commit schedule: ${data.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error committing schedule:', error)
      alert('Failed to commit schedule. Please try again.')
    } finally {
      setCommitting(false)
    }
  }

  const handleClearPreview = () => {
    setScheduledSlots([])
    setSchedulingResult(null)
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
                      className={`border rounded-lg p-4 transition-colors ${isFullyScheduled
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

              {/* Random Seed Input */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="randomSeed" className="block text-sm font-medium text-gray-700 mb-1">
                      Random Seed (Optional)
                    </label>
                    <p className="text-xs text-gray-500">
                      Use the same seed to get reproducible scheduling results
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="randomSeed"
                      type="number"
                      value={randomSeed}
                      onChange={(e) => setRandomSeed(e.target.value)}
                      placeholder="e.g. 12345"
                      className="w-24 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => setRandomSeed(Math.floor(Math.random() * 1000000).toString())}
                      className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                      title="Generate random seed"
                    >
                      🎲
                    </button>
                  </div>
                </div>
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

        {/* Scheduled Slots Preview */}
        {scheduledSlots.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Scheduling Preview
                </h2>
                <p className="text-sm text-gray-600">
                  {scheduledSlots.length} sessions scheduled • Review before committing to database
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleClearPreview}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Preview
                </button>
                <button
                  onClick={handleCommitSchedule}
                  disabled={committing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {committing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Committing...
                    </div>
                  ) : (
                    `Commit ${scheduledSlots.length} Sessions`
                  )}
                </button>
              </div>
            </div>

            {/* Scheduling Summary */}
            {schedulingResult && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-600 mt-0.5">ℹ️</div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Scheduling Summary</h4>
                    <p className="text-sm text-blue-700 mt-1">{schedulingResult.message}</p>
                    <div className="text-xs text-blue-600 mt-2">
                      {schedulingResult.coursesCount} courses • {schedulingResult.totalSessionsToSchedule} sessions requested
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Slots Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Day
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entities
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scheduledSlots
                      .sort((a, b) => {
                        const dayOrder = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 }
                        const dayDiff = (dayOrder[a.day as keyof typeof dayOrder] || 5) - (dayOrder[b.day as keyof typeof dayOrder] || 5)
                        if (dayDiff !== 0) return dayDiff

                        const aTime = a.startHour * 60 + a.startMinute
                        const bTime = b.startHour * 60 + b.startMinute
                        return aTime - bTime
                      })
                      .map((slot, index) => {
                        const startTime = `${slot.startHour}:${slot.startMinute.toString().padStart(2, '0')}`
                        const endMinutes = slot.startHour * 60 + slot.startMinute + slot.duration
                        const endTime = `${Math.floor(endMinutes / 60)}:${(endMinutes % 60).toString().padStart(2, '0')}`

                        const totalEntities = (slot.studentIds?.length || 0) +
                          (slot.facultyIds?.length || 0) +
                          (slot.hallIds?.length || 0) +
                          (slot.studentGroupIds?.length || 0) +
                          (slot.facultyGroupIds?.length || 0) +
                          (slot.hallGroupIds?.length || 0)

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{slot.courseCode}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{slot.day}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{startTime} - {endTime}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{slot.duration} min</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{totalEntities} entities</div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Day-wise Summary */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const daySlots = scheduledSlots.filter(slot => slot.day === day)
                return (
                  <div key={day} className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs font-medium text-gray-700">{day}</div>
                    <div className="text-lg font-bold text-blue-600">{daySlots.length}</div>
                    <div className="text-xs text-gray-500">sessions</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}