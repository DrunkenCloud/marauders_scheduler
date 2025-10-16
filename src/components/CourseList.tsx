'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { ApiResponse, Course } from '@/types'

// Separate component to avoid hydration issues
function SchedulingProgress({ scheduledCount, totalSessions }: { scheduledCount: number; totalSessions: number }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder during SSR to match initial render
    return (
      <div className="mt-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-gray-300" style={{ width: '0%' }}></div>
          </div>
          <span className="text-xs text-gray-600 min-w-0">
            {scheduledCount}/{totalSessions}
          </span>
        </div>
      </div>
    )
  }

  const progressPercentage = Math.min(100, (scheduledCount / totalSessions) * 100)
  const progressColor = scheduledCount >= totalSessions 
    ? 'bg-green-500' 
    : scheduledCount > 0 
      ? 'bg-yellow-500' 
      : 'bg-gray-300'

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${progressColor}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-600 min-w-0">
          {scheduledCount}/{totalSessions}
        </span>
      </div>
    </div>
  )
}

interface CourseListProps {
  onCourseSelect: (course: Course) => void
  onTimetableView: (course: Course) => void
  onCreateNew: () => void
  refreshTrigger?: number
}

export default function CourseList({ onCourseSelect, onTimetableView, onCreateNew, refreshTrigger }: CourseListProps) {
  const { currentSession } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const fetchCourses = async () => {
    if (!currentSession) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        sessionId: currentSession.id.toString(),
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/courses?${params}`)
      const result: ApiResponse = await response.json()

      if (result.success && result.data) {
        setCourses(result.data.courses)
        setTotalPages(result.data.pagination.totalPages)
        setTotal(result.data.pagination.total)
      } else {
        setError(result.error?.message || 'Failed to fetch courses')
      }
    } catch (err) {
      setError('Failed to fetch courses')
      console.error('Error fetching courses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [currentSession, currentPage, searchTerm, refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchCourses()
  }

  const handleDelete = async (course: Course) => {
    if (!confirm(`Are you sure you want to delete course "${course.code} - ${course.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'DELETE'
      })
      const result: ApiResponse = await response.json()

      if (result.success) {
        fetchCourses()
      } else {
        alert(result.error?.message || 'Failed to delete course')
      }
    } catch (err) {
      alert('Failed to delete course')
      console.error('Error deleting course:', err)
    }
  }

  if (!currentSession) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a session to view courses
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Courses</h2>
          <p className="text-sm text-gray-600">
            {total} course{total !== 1 ? 's' : ''} in {currentSession.name}
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Course
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search by course name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading courses...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Course List */}
      {!loading && !error && (
        <>
          {courses.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-2">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No courses match your search criteria.' : 'Get started by adding your first course.'}
              </p>
              <button
                onClick={onCreateNew}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Course
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scheduling
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Faculty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Halls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enrollments
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {course.code}
                            </div>
                            <div className="text-sm text-gray-500">
                              {course.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>{course.classDuration}min sessions</div>
                            <div className="text-xs text-gray-500">
                              {course.sessionsPerLecture} per lecture, {course.totalSessions} total/week
                            </div>
                            <SchedulingProgress 
                              scheduledCount={course.scheduledCount || 0}
                              totalSessions={course.totalSessions}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="space-y-2">
                              {/* Faculty Count Summary */}
                              <div className="flex items-center gap-2">
                                {course.compulsoryFaculties.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    👤 {course.compulsoryFaculties.length} faculty
                                  </span>
                                )}
                                {course.compulsoryFacultyGroups && course.compulsoryFacultyGroups.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-900 border border-green-300">
                                    📋 {course.compulsoryFacultyGroups.length} groups
                                  </span>
                                )}
                              </div>
                              
                              {/* Individual Faculty Names (first 2) */}
                              {course.compulsoryFaculties.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {course.compulsoryFaculties.slice(0, 2).map((faculty) => (
                                    <span
                                      key={faculty.id}
                                      className="text-xs text-gray-600"
                                    >
                                      {faculty.shortForm || faculty.name}
                                    </span>
                                  ))}
                                  {course.compulsoryFaculties.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{course.compulsoryFaculties.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Faculty Group Names (first 2) */}
                              {course.compulsoryFacultyGroups && course.compulsoryFacultyGroups.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {course.compulsoryFacultyGroups.slice(0, 2).map((group) => (
                                    <span
                                      key={group.facultyGroup.id}
                                      className="text-xs text-gray-600"
                                    >
                                      📋 {group.facultyGroup.groupName}
                                    </span>
                                  ))}
                                  {course.compulsoryFacultyGroups.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{course.compulsoryFacultyGroups.length - 2} more groups
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* No assignments */}
                              {course.compulsoryFaculties.length === 0 && 
                               (!course.compulsoryFacultyGroups || course.compulsoryFacultyGroups.length === 0) && (
                                <span className="text-gray-500 text-xs">No faculty assigned</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="space-y-2">
                              {/* Halls Count Summary */}
                              <div className="flex items-center gap-2">
                                {course.compulsoryHalls.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    🏛️ {course.compulsoryHalls.length} halls
                                  </span>
                                )}
                                {course.compulsoryHallGroups && course.compulsoryHallGroups.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-900 border border-purple-300">
                                    🏢 {course.compulsoryHallGroups.length} groups
                                  </span>
                                )}
                              </div>
                              
                              {/* Individual Hall Names (first 2) */}
                              {course.compulsoryHalls.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {course.compulsoryHalls.slice(0, 2).map((hall) => (
                                    <span
                                      key={hall.id}
                                      className="text-xs text-gray-600"
                                    >
                                      {hall.shortForm || hall.name}
                                    </span>
                                  ))}
                                  {course.compulsoryHalls.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{course.compulsoryHalls.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Hall Group Names (first 2) */}
                              {course.compulsoryHallGroups && course.compulsoryHallGroups.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {course.compulsoryHallGroups.slice(0, 2).map((group) => (
                                    <span
                                      key={group.hallGroup.id}
                                      className="text-xs text-gray-600"
                                    >
                                      🏢 {group.hallGroup.groupName} (req: {group.requiredCount})
                                    </span>
                                  ))}
                                  {course.compulsoryHallGroups.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{course.compulsoryHallGroups.length - 2} more groups
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* No assignments */}
                              {course.compulsoryHalls.length === 0 && 
                               (!course.compulsoryHallGroups || course.compulsoryHallGroups.length === 0) && (
                                <span className="text-gray-500 text-xs">No halls assigned</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="space-y-2">
                              {/* Enrollment Count Summary */}
                              <div className="flex items-center gap-2">
                                {course.studentEnrollments.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    👤 {course.studentEnrollments.length} students
                                  </span>
                                )}
                                {course.studentGroupEnrollments.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-900 border border-blue-300">
                                    👥 {course.studentGroupEnrollments.length} groups
                                  </span>
                                )}
                              </div>
                              
                              {/* Student Group Names (first 2) */}
                              {course.studentGroupEnrollments.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {course.studentGroupEnrollments.slice(0, 2).map((enrollment) => (
                                    <span
                                      key={enrollment.studentGroup.id}
                                      className="text-xs text-gray-600"
                                    >
                                      👥 {enrollment.studentGroup.groupName}
                                    </span>
                                  ))}
                                  {course.studentGroupEnrollments.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{course.studentGroupEnrollments.length - 2} more groups
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Total enrollment summary */}
                              {(course.studentEnrollments.length > 0 || course.studentGroupEnrollments.length > 0) && (
                                <div className="text-xs text-gray-500">
                                  Total: {course.studentEnrollments.length + course.studentGroupEnrollments.length} enrollments
                                </div>
                              )}
                              
                              {/* No enrollments */}
                              {course.studentEnrollments.length === 0 && course.studentGroupEnrollments.length === 0 && (
                                <span className="text-gray-500 text-xs">No enrollments</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => onTimetableView(course)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="View course timetable"
                            >
                              📅 Timetable
                            </button>
                            <button
                              onClick={() => onCourseSelect(course)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(course)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * limit, total)}
                        </span>{' '}
                        of <span className="font-medium">{total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let page
                          if (totalPages <= 5) {
                            page = i + 1
                          } else if (currentPage <= 3) {
                            page = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i
                          } else {
                            page = currentPage - 2 + i
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        })}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}