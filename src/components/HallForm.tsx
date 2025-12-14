'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { ApiResponse, Hall } from '@/types'

interface HallFormProps {
  hall?: Hall | null
  onSave: () => void
  onCancel: () => void
}

export default function HallForm({ hall, onSave, onCancel }: HallFormProps) {
  const { currentSession } = useSession()
  const [name, setName] = useState('')
  const [floor, setFloor] = useState('')
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [building, setBuilding] = useState('')
  const [shortForm, setShortForm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!hall

  useEffect(() => {
    if (hall) {
      setName(hall.name)
      setFloor(hall.Floor)
      setBuilding(hall.Building)
      setShortForm(hall.shortForm || '')
    } else {
      setName('')
      setFloor('')
      setBuilding('')
      setShortForm('')
    }
    setError(null)
  }, [hall])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentSession) {
      setError('No session selected')
      return
    }

    if (!name.trim()) {
      setError('Hall name is required')
      return
    }

    if (!floor.trim()) {
      setError('Floor is required')
      return
    }

    if (!building.trim()) {
      setError('Building is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const url = isEditing ? `${basePath}/api/halls/${hall.id}` : `${basePath}/api/halls`
      const method = isEditing ? 'PUT' : 'POST'
      
      const body: any = {
        name: name.trim(),
        floor: floor.trim(),
        building: building.trim(),
        shortForm: shortForm.trim() || null
      }

      if (!isEditing) {
        body.sessionId = currentSession.id
        // Initialize with empty timetable structure (halls can have partial timetables)
        body.timetable = {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
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
        setError(result.error?.message || `Failed to ${isEditing ? 'update' : 'create'} hall`)
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} hall`)
      console.error(`Error ${isEditing ? 'updating' : 'creating'} hall:`, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Hall' : 'Add New Hall'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isEditing 
            ? 'Update hall information' 
            : `Add a new hall to ${currentSession?.name}`
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hall Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Hall Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter hall name (e.g., Lecture Hall A, Lab 101)"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            The name or identifier for this hall
          </p>
        </div>

        {/* Building and Floor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-1">
              Building *
            </label>
            <input
              type="text"
              id="building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter building name"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Building where the hall is located
            </p>
          </div>

          <div>
            <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-1">
              Floor *
            </label>
            <input
              type="text"
              id="floor"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter floor (e.g., 1, 2, Ground)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Floor number or level
            </p>
          </div>
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
            placeholder="Enter short form or abbreviation (optional)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional abbreviated name for display purposes (e.g., LHA, L101)
          </p>
        </div>

        {/* Session Info (for new halls) */}
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

        {/* Timetable Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Timetable Information</h4>
          <p className="text-sm text-gray-600">
            {isEditing 
              ? 'The hall\'s timetable can be managed separately after saving. Hall timetables only need to show occupied time slots.'
              : 'A new empty timetable will be created for this hall. You can edit it after creation to add scheduled classes.'
            }
          </p>
        </div>

        {/* Course Assignment Info */}
        {isEditing && hall && hall.coursesTaught.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">Current Course Assignments</h4>
            <div className="flex flex-wrap gap-2">
              {hall.coursesTaught.map((course) => (
                <span
                  key={course.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {course.code} - {course.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-green-700 mt-2">
              This hall is currently assigned to these courses.
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
              isEditing ? 'Update Hall' : 'Create Hall'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}