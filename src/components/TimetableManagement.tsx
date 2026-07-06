'use client'

import React, { useState, useEffect } from 'react'
import { EntityType, EntityTimetable } from '@/types'
import { useSession } from '@/contexts/SessionContext'
import TimetableEditor from './TimetableEditor'
import { convertEntityTimetableToRaw, convertRawTimetableToEntityTimetable } from '@/lib/timetable'

interface TimetableManagementProps {
  entityId: string
  entityType: EntityType
  entityName?: string
  onBack?: () => void
}

export default function TimetableManagement({ entityId, entityType, entityName, onBack }: TimetableManagementProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const { currentSession } = useSession()
  const [timetable, setTimetable] = useState<EntityTimetable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentSession) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${basePath}/api/timetables?entityType=${entityType}&entityId=${entityId}&sessionId=${currentSession.id}`)
        const data = await res.json()
        if (data.success) {
          setTimetable(convertRawTimetableToEntityTimetable(data.data.timetable, entityId, entityType))
        } else {
          setError(data.error?.message || 'Failed to load timetable')
        }
      } catch {
        setError('Failed to load timetable')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entityId, entityType, currentSession, basePath])

  const handleSave = async (updatedTimetable: EntityTimetable) => {
    if (!currentSession) return
    const res = await fetch(`${basePath}/api/timetables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType, entityId, sessionId: currentSession.id,
        timetable: convertEntityTimetableToRaw(updatedTimetable)
      })
    })
    const data = await res.json()
    if (data.success) {
      setTimetable(convertRawTimetableToEntityTimetable(data.data, entityId, entityType))
      alert('Timetable saved successfully!')
    } else {
      throw new Error(data.error?.message || 'Failed to save timetable')
    }
  }

  const getLabel = (type: EntityType) => {
    const map: Record<string, string> = {
      student: 'Student', faculty: 'Faculty', hall: 'Hall', course: 'Course',
      studentGroup: 'Student Group', facultyGroup: 'Faculty Group', hallGroup: 'Hall Group'
    }
    return map[type] || 'Entity'
  }

  if (loading) return <div className="flex items-center justify-center p-8 text-gray-500">Loading timetable...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        <p>{error}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => window.location.reload()} className="text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200">Retry</button>
          {onBack && <button onClick={onBack} className="text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200">Go Back</button>}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getLabel(entityType)} Timetable</h2>
            {entityName && <p className="text-sm text-gray-500 mt-1">{entityName}</p>}
          </div>
          {onBack && (
            <button onClick={onBack} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {getLabel(entityType)} List
            </button>
          )}
        </div>
      </div>
      {timetable && (
        <TimetableEditor
          entityId={entityId}
          entityType={entityType}
          timetable={timetable}
          onSave={handleSave}
          onCancel={onBack}
        />
      )}
    </>
  )
}
