'use client'

import { useState } from 'react'
import HallList from './HallList'
import HallForm from './HallForm'

interface Hall {
  id: number
  name: string
  Floor: string
  Building: string
  shortForm: string | null
  timetable: any
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  hallGroupMemberships: Array<{
    hallGroup: {
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

type ViewMode = 'list' | 'create' | 'edit'

export default function HallManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateNew = () => {
    setSelectedHall(null)
    setViewMode('create')
  }

  const handleHallSelect = (hall: Hall) => {
    setSelectedHall(hall)
    setViewMode('edit')
  }

  const handleSave = () => {
    setViewMode('list')
    setSelectedHall(null)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedHall(null)
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          {viewMode === 'list' ? (
            <div className="p-6">
              <HallList
                onHallSelect={handleHallSelect}
                onCreateNew={handleCreateNew}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : (
            <div className="p-6">
              <HallForm
                hall={viewMode === 'edit' ? selectedHall : null}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}