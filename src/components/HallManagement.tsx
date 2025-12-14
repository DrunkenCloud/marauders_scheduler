'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Hall, ViewMode, EntityType } from '@/types'
import HallList from './HallList'
import HallForm from './HallForm'
import TimetableManagement from './TimetableManagement'

type ExtendedViewMode = ViewMode | 'timetable'

export default function HallManagement() {
  const router = useRouter()
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ExtendedViewMode>('list')
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load state from URL on mount
  useEffect(() => {
    const mode = searchParams.get('mode') as ExtendedViewMode
    const hallId = searchParams.get('hallId')
    
    if (mode && ['list', 'create', 'edit', 'timetable'].includes(mode)) {
      setViewMode(mode)
      
      if (hallId && (mode === 'edit' || mode === 'timetable')) {
        // Load hall data
        fetch(`${basePath}/api/halls/${hallId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              setSelectedHall(data.data)
            }
          })
          .catch(err => console.error('Error loading hall:', err))
      }
    }
  }, [searchParams])

  const updateURL = (mode: ExtendedViewMode, hallId?: string) => {
    const params = new URLSearchParams()
    params.set('mode', mode)
    if (hallId) params.set('hallId', hallId)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleCreateNew = () => {
    setSelectedHall(null)
    setViewMode('create')
    updateURL('create')
  }

  const handleHallSelect = (hall: Hall) => {
    setSelectedHall(hall)
    setViewMode('edit')
    updateURL('edit', hall.id)
  }

  const handleSave = () => {
    setViewMode('list')
    setSelectedHall(null)
    setRefreshTrigger(prev => prev + 1)
    updateURL('list')
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedHall(null)
    updateURL('list')
  }

  const handleManageTimetable = (hall: Hall) => {
    setSelectedHall(hall)
    setViewMode('timetable')
    updateURL('timetable', hall.id)
  }

  const handleBackFromTimetable = () => {
    setViewMode('list')
    setSelectedHall(null)
    updateURL('list')
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
              entityId={selectedHall?.id || ''}
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