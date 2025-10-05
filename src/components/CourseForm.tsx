'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { ApiResponse, Course, Faculty, Hall, Student, StudentGroup, FacultyGroup, HallGroup } from '@/types'

interface CourseFormProps {
  course?: Course | null
  onSave: () => void
  onCancel: () => void
}

export default function CourseForm({ course, onSave, onCancel }: CourseFormProps) {
  const { currentSession } = useSession()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [classDuration, setClassDuration] = useState(50)
  const [sessionsPerLecture, setSessionsPerLecture] = useState(1)
  const [totalSessions, setTotalSessions] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Enrollment state
  const [selectedFaculty, setSelectedFaculty] = useState<number[]>([])
  const [selectedHalls, setSelectedHalls] = useState<number[]>([])
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [selectedStudentGroups, setSelectedStudentGroups] = useState<number[]>([])
  const [selectedFacultyGroups, setSelectedFacultyGroups] = useState<number[]>([])
  const [selectedHallGroups, setSelectedHallGroups] = useState<number[]>([])

  // Reference data
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [facultyGroups, setFacultyGroups] = useState<FacultyGroup[]>([])
  const [hallGroups, setHallGroups] = useState<HallGroup[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const isEditing = !!course

  // Load reference data
  useEffect(() => {
    if (!currentSession) return

    const loadReferenceData = async () => {
      setLoadingData(true)
      try {
        const [facultyRes, hallsRes, studentsRes, studentGroupsRes, facultyGroupsRes, hallGroupsRes] = await Promise.all([
          fetch(`/api/faculty?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/halls?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/students?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/student-groups?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/faculty-groups?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/hall-groups?sessionId=${currentSession.id}&limit=1000`)
        ])

        const [facultyData, hallsData, studentsData, studentGroupsData, facultyGroupsData, hallGroupsData] = await Promise.all([
          facultyRes.json(),
          hallsRes.json(),
          studentsRes.json(),
          studentGroupsRes.json(),
          facultyGroupsRes.json(),
          hallGroupsRes.json()
        ])

        if (facultyData.success) setFaculty(facultyData.data.faculty || [])
        if (hallsData.success) setHalls(hallsData.data.halls || [])
        if (studentsData.success) setStudents(studentsData.data.students || [])
        if (studentGroupsData.success) setStudentGroups(studentGroupsData.data.studentGroups || [])
        if (facultyGroupsData.success) setFacultyGroups(facultyGroupsData.data.facultyGroups || [])
        if (hallGroupsData.success) setHallGroups(hallGroupsData.data.hallGroups || [])
      } catch (error) {
        console.error('Error loading reference data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadReferenceData()
  }, [currentSession])

  useEffect(() => {
    if (course) {
      setName(course.name)
      setCode(course.code)
      setClassDuration(course.classDuration)
      setSessionsPerLecture(course.sessionsPerLecture)
      setTotalSessions(course.totalSessions)
      
      // Set enrollment selections
      setSelectedFaculty(course.compulsoryFaculties?.map(f => f.id) || [])
      setSelectedHalls(course.compulsoryHalls?.map(h => h.id) || [])
      setSelectedStudents(course.studentEnrollments?.map(e => e.student.id) || [])
      setSelectedStudentGroups(course.studentGroupEnrollments?.map(e => e.studentGroup.id) || [])
      setSelectedFacultyGroups(course.compulsoryFacultyGroups?.map(g => g.facultyGroup.id) || [])
      setSelectedHallGroups(course.compulsoryHallGroups?.map(g => g.hallGroup.id) || [])
    } else {
      setName('')
      setCode('')
      setClassDuration(50)
      setSessionsPerLecture(1)
      setTotalSessions(3)
      
      // Reset enrollment selections
      setSelectedFaculty([])
      setSelectedHalls([])
      setSelectedStudents([])
      setSelectedStudentGroups([])
      setSelectedFacultyGroups([])
      setSelectedHallGroups([])
    }
    setError(null)
  }, [course])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentSession) {
      setError('No session selected')
      return
    }

    if (!name.trim()) {
      setError('Course name is required')
      return
    }

    if (!code.trim()) {
      setError('Course code is required')
      return
    }

    if (classDuration < 1) {
      setError('Class duration must be at least 1 minute')
      return
    }

    if (sessionsPerLecture < 1) {
      setError('Sessions per lecture must be at least 1')
      return
    }

    if (totalSessions < 1) {
      setError('Total sessions per week must be at least 1')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const url = isEditing ? `/api/courses/${course.id}` : '/api/courses'
      const method = isEditing ? 'PUT' : 'POST'
      
      const body: any = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        classDuration,
        sessionsPerLecture,
        totalSessions,
        // Enrollment data
        facultyIds: selectedFaculty,
        hallIds: selectedHalls,
        studentIds: selectedStudents,
        studentGroupIds: selectedStudentGroups,
        facultyGroupIds: selectedFacultyGroups,
        hallGroupIds: selectedHallGroups
      }

      if (!isEditing) {
        body.sessionId = currentSession.id
        // Initialize with empty timetable structure
        body.timetable = {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: []
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result: ApiResponse = await response.json()

      if (result.success) {
        onSave()
      } else {
        setError(result.error?.message || `Failed to ${isEditing ? 'update' : 'create'} course`)
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} course`)
      console.error(`Error ${isEditing ? 'updating' : 'creating'} course:`, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Course' : 'Add New Course'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isEditing 
            ? 'Update course information and scheduling parameters' 
            : `Add a new course to ${currentSession?.name}`
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Course Name and Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Course Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter course name"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Full name of the course
            </p>
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Course Code *
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter course code"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for the course (e.g., CS101, MATH202)
            </p>
          </div>
        </div>

        {/* Scheduling Parameters */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Scheduling Parameters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="classDuration" className="block text-sm font-medium text-gray-700 mb-1">
                Class Duration (minutes) *
              </label>
              <input
                type="number"
                id="classDuration"
                value={classDuration}
                onChange={(e) => setClassDuration(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="50"
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Duration of each class session
              </p>
            </div>

            <div>
              <label htmlFor="sessionsPerLecture" className="block text-sm font-medium text-gray-700 mb-1">
                Sessions per Lecture *
              </label>
              <input
                type="number"
                id="sessionsPerLecture"
                value={sessionsPerLecture}
                onChange={(e) => setSessionsPerLecture(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Consecutive sessions needed per lecture
              </p>
            </div>

            <div>
              <label htmlFor="totalSessions" className="block text-sm font-medium text-gray-700 mb-1">
                Total Sessions per Week *
              </label>
              <input
                type="number"
                id="totalSessions"
                value={totalSessions}
                onChange={(e) => setTotalSessions(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="3"
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Total sessions scheduled per week
              </p>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Example:</strong> A course with 50-minute sessions, 2 sessions per lecture, and 3 total sessions per week 
              would need 2 consecutive 50-minute slots for each lecture, scheduled 3 times throughout the week.
            </p>
          </div>
        </div>

        {/* Enrollment Management */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Course Enrollments & Assignments</h4>
          
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-500">Loading enrollment options...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Faculty Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Faculty
                </label>
                <select
                  multiple
                  value={selectedFaculty.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setSelectedFaculty(values)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                >
                  {faculty.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.shortForm ? `(${f.shortForm})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl/Cmd to select multiple faculty members who will teach this course
                </p>
              </div>

              {/* Faculty Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty Groups
                </label>
                <select
                  multiple
                  value={selectedFacultyGroups.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setSelectedFacultyGroups(values)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                >
                  {facultyGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.groupName} ({group._count.facultyMemberships} members)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Faculty groups that can teach this course
                </p>
              </div>

              {/* Hall Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Halls
                </label>
                <select
                  multiple
                  value={selectedHalls.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setSelectedHalls(values)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                >
                  {halls.map(hall => (
                    <option key={hall.id} value={hall.id}>
                      {hall.name} - {hall.Building} Floor {hall.Floor} {hall.shortForm ? `(${hall.shortForm})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Halls where this course will be conducted
                </p>
              </div>

              {/* Hall Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hall Groups
                </label>
                <select
                  multiple
                  value={selectedHallGroups.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setSelectedHallGroups(values)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                >
                  {hallGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.groupName} ({group._count.hallMemberships} halls)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hall groups available for this course
                </p>
              </div>

              {/* Student Enrollment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Individual Student Enrollments
                </label>
                <select
                  multiple
                  value={selectedStudents.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setSelectedStudents(values)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                >
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      Student {student.digitalId}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Individual students enrolled in this course
                </p>
              </div>

              {/* Student Group Enrollment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Group Enrollments
                </label>
                <select
                  multiple
                  value={selectedStudentGroups.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setSelectedStudentGroups(values)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                >
                  {studentGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.groupName} ({group._count.studentMemberships} students)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Student groups enrolled in this course
                </p>
              </div>

              {/* Selection Summary */}
              {(selectedFaculty.length > 0 || selectedHalls.length > 0 || selectedStudents.length > 0 || selectedStudentGroups.length > 0 || selectedFacultyGroups.length > 0 || selectedHallGroups.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Current Selections</h5>
                  <div className="text-xs text-blue-800 space-y-1">
                    {selectedFaculty.length > 0 && <p>• {selectedFaculty.length} faculty member(s) selected</p>}
                    {selectedFacultyGroups.length > 0 && <p>• {selectedFacultyGroups.length} faculty group(s) selected</p>}
                    {selectedHalls.length > 0 && <p>• {selectedHalls.length} hall(s) selected</p>}
                    {selectedHallGroups.length > 0 && <p>• {selectedHallGroups.length} hall group(s) selected</p>}
                    {selectedStudents.length > 0 && <p>• {selectedStudents.length} individual student(s) enrolled</p>}
                    {selectedStudentGroups.length > 0 && <p>• {selectedStudentGroups.length} student group(s) enrolled</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Session Info (for new courses) */}
        {!isEditing && currentSession && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Session Information</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Session:</strong> {currentSession.name}</p>
              <p><strong>Created:</strong> {new Date(currentSession.createdAt).toLocaleDateString()}</p>
              {currentSession.details && (
                <p><strong>Description:</strong> {currentSession.details}</p>
              )}
            </div>
          </div>
        )}

        {/* Assignment Info */}
        {isEditing && course && (
          <div className="space-y-3">
            {course.compulsoryFaculties.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Assigned Faculty</h4>
                <div className="flex flex-wrap gap-2">
                  {course.compulsoryFaculties.map((faculty) => (
                    <span
                      key={faculty.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {faculty.shortForm || faculty.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {course.compulsoryFacultyGroups && course.compulsoryFacultyGroups.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Assigned Faculty Groups</h4>
                <div className="flex flex-wrap gap-2">
                  {course.compulsoryFacultyGroups.map((group) => (
                    <span
                      key={group.facultyGroup.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {group.facultyGroup.groupName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {course.compulsoryHalls.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-900 mb-2">Assigned Halls</h4>
                <div className="flex flex-wrap gap-2">
                  {course.compulsoryHalls.map((hall) => (
                    <span
                      key={hall.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                    >
                      {hall.shortForm || hall.name} ({hall.Building}, Floor {hall.Floor})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {course.compulsoryHallGroups && course.compulsoryHallGroups.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-900 mb-2">Assigned Hall Groups</h4>
                <div className="flex flex-wrap gap-2">
                  {course.compulsoryHallGroups.map((group) => (
                    <span
                      key={group.hallGroup.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                    >
                      {group.hallGroup.groupName} (Req: {group.requiredCount})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(course.studentEnrollments.length > 0 || course.studentGroupEnrollments.length > 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">Current Enrollments</h4>
                <div className="text-sm text-yellow-800">
                  <p>{course.studentEnrollments.length} individual students enrolled</p>
                  <p>{course.studentGroupEnrollments.length} student groups enrolled</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
              </div>
            ) : (
              isEditing ? 'Update Course' : 'Create Course'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}