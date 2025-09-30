'use client'

import { useState } from 'react'
import TimingFields from './TimingFields'
import { FacultyGroupFormData } from '@/types'

interface FacultyGroupFormProps {
  onSubmit: (data: FacultyGroupFormData) => void
  onCancel: () => void
  initialData?: Partial<FacultyGroupFormData>
  isLoading?: boolean
}

export function FacultyGroupForm({ onSubmit, onCancel, initialData, isLoading }: FacultyGroupFormProps) {
  const [formData, setFormData] = useState<FacultyGroupFormData>({
    groupName: initialData?.groupName || '',
    startHour: initialData?.startHour || 8,
    startMinute: initialData?.startMinute || 10,
    endHour: initialData?.endHour || 17,
    endMinute: initialData?.endMinute || 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.groupName.trim()) {
      newErrors.groupName = 'Group name is required'
    } else if (formData.groupName.trim().length < 2) {
      newErrors.groupName = 'Group name must be at least 2 characters long'
    }

    // Validate timing
    const startMinutes = formData.startHour * 60 + formData.startMinute
    const endMinutes = formData.endHour * 60 + formData.endMinute

    if (startMinutes >= endMinutes) {
      newErrors.timing = 'End time must be after start time'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleStartHourChange = (hour: number) => {
    setFormData(prev => ({ ...prev, startHour: hour }))
  }

  const handleStartMinuteChange = (minute: number) => {
    setFormData(prev => ({ ...prev, startMinute: minute }))
  }

  const handleEndHourChange = (hour: number) => {
    setFormData(prev => ({ ...prev, endHour: hour }))
  }

  const handleEndMinuteChange = (minute: number) => {
    setFormData(prev => ({ ...prev, endMinute: minute }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
          Group Name *
        </label>
        <input
          type="text"
          id="groupName"
          value={formData.groupName}
          onChange={(e) => setFormData(prev => ({ ...prev, groupName: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.groupName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter group name (e.g., Senior Faculty, Lab Instructors)"
          disabled={isLoading}
        />
        {errors.groupName && (
          <p className="mt-1 text-sm text-red-600">{errors.groupName}</p>
        )}
      </div>

      <div>
        <TimingFields
          startHour={formData.startHour}
          startMinute={formData.startMinute}
          endHour={formData.endHour}
          endMinute={formData.endMinute}
          onStartHourChange={handleStartHourChange}
          onStartMinuteChange={handleStartMinuteChange}
          onEndHourChange={handleEndHourChange}
          onEndMinuteChange={handleEndMinuteChange}
          title="Group Working Hours"
          description="Set the working day hours for this faculty group. This determines when group members can be scheduled."
        />
        {errors.timing && (
          <p className="mt-1 text-sm text-red-600">{errors.timing}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : initialData ? 'Update Group' : 'Create Group'}
        </button>
      </div>
    </form>
  )
}