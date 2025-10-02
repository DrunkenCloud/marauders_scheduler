'use client'

import { useState } from 'react'
import { Hall, ViewMode, EntityType } from '@/types'
import HallList from './HallList'
import HallForm from './HallForm'
import TimetableManagement from './TimetableManagement'

type ExtendedViewMode = ViewMode | 'timetable'

export default function HallManagement() {
  const [viewMode, setViewMode] = useState<ExtendedViewMode>('list')
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

  const handleManageTimetable = (hall: Hall) => {
    setSelectedHall(hall)
    setViewMode('timetable')
  }

  const handleBackFromTimetable = () => {
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
                onManageTimetable={handleManageTimetable}
                refreshTrigger={refreshTrigger}
              />
            </div>
          ) : viewMode === 'timetable' ? (
            <TimetableManagement
              entityId={selectedHall?.id || 0}
              entityType={EntityType.HALL}
              entityName={selectedHall?.name}
              onBack={handleBackFromTimetable}
            />
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