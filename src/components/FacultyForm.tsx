'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { ApiResponse } from '@/types'

interface Faculty {
  id: number
  name: string
  shortForm: string | null
  timetable: any
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  facultyGroupMemberships: Array<{
    facultyGroup: {
      id: number
      groupName: string
    }
  }>
  coursesTaught: Array<{
    id: number
    name: string
    code: string
  }>
}

interface FacultyFormProps {
  faculty?: Faculty | null
  onSave: () => void
  onCancel: () => void
}

export default function FacultyForm({ faculty, onSave, onCancel }: FacultyFormProps) {
  const { currentSession } = useSession()
  const [name, setName] = useState('')
  const [shortForm, setShortForm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!faculty

  useEffect(() => {
    if (faculty) {
      setName(faculty.name)
      setShortForm(faculty.shortForm || '')
    } else {
      setName('')
      setShortForm('')
    }
    setError(null)
  }, [faculty])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentSession) {
      setError('No session selected')
      return
    }

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const url = isEditing ? `/api/faculty/${faculty.id}` : '/api/faculty'
      const method = isEditing ? 'PUT' : 'POST'
      
      const body: any = {
        name: name.trim(),
        shortForm: shortForm.trim() || null
      }

      if (!isEditing) {
        body.sessionId = currentSession.id
        // Initialize with empty timetable structure (faculty can have partial timetables)
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
        setError(result.error?.message || `Failed to ${isEditing ? 'update' : 'create'} faculty`)
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} faculty`)
      console.error(`Error ${isEditing ? 'updating' : 'creating'} faculty:`, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Faculty' : 'Add New Faculty'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isEditing 
            ? 'Update faculty member information' 
            : `Add a new faculty member to ${currentSession?.name}`
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter faculty member's full name"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            The complete name of the faculty member
          </p>
        </div>

        {/* Short Form */}
        <div>
          <label htmlFor="shortForm" className="block text-sm font-medium text-gray-700 mb-1">
            Short Form
          </label>
          <input
            type="text"
            id="shortForm"
            value={shortForm}
            onChange={(e) => setShortForm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter short form or initials (optional)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional abbreviated name or initials for display purposes
          </p>
        </div>

        {/* Session Info (for new faculty) */}
        {!isEditing && currentSession && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Session Information</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Session:</strong> {currentSession.name}</p>
              <p><strong>Time Range:</strong> {currentSession.startTime} - {currentSession.endTime}</p>
              {currentSession.details && (
                <p><strong>Description:</strong> {currentSession.details}</p>
              )}
            </div>
          </div>
        )}

        {/* Timetable Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Timetable Information</h4>
          <p className="text-sm text-gray-600">
            {isEditing 
              ? 'The faculty member\'s timetable can be managed separately after saving. Faculty timetables only need to show occupied time slots.'
              : 'A new empty timetable will be created for this faculty member. You can edit it after creation to add their scheduled classes.'
            }
          </p>
        </div>

        {/* Course Assignment Info */}
        {isEditing && faculty && faculty.coursesTaught.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">Current Course Assignments</h4>
            <div className="flex flex-wrap gap-2">
              {faculty.coursesTaught.map((course) => (
                <span
                  key={course.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {course.code} - {course.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-green-700 mt-2">
              This faculty member is currently assigned to teach these courses.
            </p>
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
              isEditing ? 'Update Faculty' : 'Create Faculty'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}