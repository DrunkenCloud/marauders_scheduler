'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { ApiResponse } from '@/types'
import TimingFields from './TimingFields'

interface Student {
  id: number
  digitalId: number
  timetable: any
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  studentGroupMemberships: Array<{
    studentGroup: {
      id: number
      groupName: string
    }
  }>
}

interface StudentFormProps {
  student?: Student | null
  onSave: () => void
  onCancel: () => void
}

export default function StudentForm({ student, onSave, onCancel }: StudentFormProps) {
  const { currentSession } = useSession()
  const [digitalId, setDigitalId] = useState('')
  const [startHour, setStartHour] = useState(8)
  const [startMinute, setStartMinute] = useState(10)
  const [endHour, setEndHour] = useState(15)
  const [endMinute, setEndMinute] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!student

  useEffect(() => {
    if (student) {
      setDigitalId(student.digitalId.toString())
      setStartHour(student.startHour)
      setStartMinute(student.startMinute)
      setEndHour(student.endHour)
      setEndMinute(student.endMinute)
    } else {
      setDigitalId('')
      setStartHour(8)
      setStartMinute(10)
      setEndHour(15)
      setEndMinute(30)
    }
    setError(null)
  }, [student])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentSession) {
      setError('No session selected')
      return
    }

    if (!digitalId.trim()) {
      setError('Digital ID is required')
      return
    }

    const digitalIdNum = parseInt(digitalId.trim())
    if (isNaN(digitalIdNum)) {
      setError('Digital ID must be a valid number')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const url = isEditing ? `/api/students/${student.id}` : '/api/students'
      const method = isEditing ? 'PUT' : 'POST'
      
      const body: any = {
        digitalId: digitalIdNum,
        startHour,
        startMinute,
        endHour,
        endMinute
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
        setError(result.error?.message || `Failed to ${isEditing ? 'update' : 'create'} student`)
      }
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} student`)
      console.error(`Error ${isEditing ? 'updating' : 'creating'} student:`, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Student' : 'Add New Student'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isEditing 
            ? 'Update student information' 
            : `Add a new student to ${currentSession?.name}`
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Digital ID */}
        <div>
          <label htmlFor="digitalId" className="block text-sm font-medium text-gray-700 mb-1">
            Digital ID *
          </label>
          <input
            type="number"
            id="digitalId"
            value={digitalId}
            onChange={(e) => setDigitalId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter student's digital ID"
            required
            min="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            A unique numeric identifier for the student
          </p>
        </div>

        {/* Working Hours */}
        <TimingFields
          startHour={startHour}
          startMinute={startMinute}
          endHour={endHour}
          endMinute={endMinute}
          onStartHourChange={setStartHour}
          onStartMinuteChange={setStartMinute}
          onEndHourChange={setEndHour}
          onEndMinuteChange={setEndMinute}
          title="Working Hours"
          description="Set the student's working day hours. This determines when they can be scheduled for classes."
        />

        {/* Session Info (for new students) */}
        {!isEditing && currentSession && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Session Information</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Session:</strong> {currentSession.name}</p>
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
              ? 'The student\'s timetable can be managed separately after saving.'
              : 'A new empty timetable will be created for this student. You can edit it after creation.'
            }
          </p>
        </div>

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
              isEditing ? 'Update Student' : 'Create Student'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}