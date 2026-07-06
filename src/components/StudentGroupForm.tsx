'use client'

import { useState } from 'react'
import { StudentGroupFormData } from '@/types'

interface StudentGroupFormProps {
  onSubmit: (data: StudentGroupFormData) => void
  onCancel: () => void
  initialData?: Partial<StudentGroupFormData>
  isLoading?: boolean
}

export function StudentGroupForm({ onSubmit, onCancel, initialData, isLoading }: StudentGroupFormProps) {
  const [groupName, setGroupName] = useState(initialData?.groupName || '')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || groupName.trim().length < 2) {
      setError('Group name must be at least 2 characters')
      return
    }
    setError('')
    onSubmit({ groupName: groupName.trim() })
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
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter group name (e.g., CS-2024-A, Math-Group-1)"
          disabled={isLoading}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onCancel} disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? 'Saving...' : initialData?.groupName ? 'Update Group' : 'Create Group'}
        </button>
      </div>
    </form>
  )
}
