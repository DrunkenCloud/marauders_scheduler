'use client'

import React, { useState, useEffect } from 'react'
import { EntityType, EntityTimetable } from '@/types'
import { useSession } from '@/contexts/SessionContext'
import TimetableEditor from './TimetableEditor'

interface TimetableManagementProps {
  entityId: string
  entityType: EntityType
  entityName?: string
  onBack?: () => void
}

export default function TimetableManagement({
  entityId,
  entityType,
  entityName,
  onBack
}: TimetableManagementProps) {
  const { currentSession } = useSession()
  const [timetable, setTimetable] = useState<EntityTimetable | null>(null)
  const [entityTiming, setEntityTiming] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load timetable data
  useEffect(() => {
    if (!currentSession) return

    const loadTimetable = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(
          `/api/timetables?entityType=${entityType}&entityId=${entityId}&sessionId=${currentSession.id}`
        )
        
        const data = await response.json()
        
        if (data.success) {
          setTimetable(data.data.timetable)
          setEntityTiming(data.data.entityTiming)
        } else {
          setError(data.error?.message || 'Failed to load timetable')
        }
      } catch (err) {
        console.error('Error loading timetable:', err)
        setError('Failed to load timetable')
      } finally {
        setLoading(false)
      }
    }

    loadTimetable()
  }, [entityId, entityType, currentSession])

  const handleSave = async (updatedTimetable: EntityTimetable) => {
    if (!currentSession) return

    try {
      const response = await fetch('/api/timetables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType,
          entityId,
          sessionId: currentSession.id,
          timetable: updatedTimetable
        })
      })

      const data = await response.json()

      if (data.success) {
        setTimetable(data.data)
        alert('Timetable saved successfully!')
      } else {
        throw new Error(data.error?.message || 'Failed to save timetable')
      }
    } catch (err) {
      console.error('Error saving timetable:', err)
      throw err
    }
  }

  const getEntityTypeLabel = (type: EntityType): string => {
    switch (type) {
      case EntityType.STUDENT: return 'Student'
      case EntityType.FACULTY: return 'Faculty'
      case EntityType.HALL: return 'Hall'
      case EntityType.COURSE: return 'Course'
      case EntityType.STUDENT_GROUP: return 'Student Group'
      case EntityType.FACULTY_GROUP: return 'Faculty Group'
      case EntityType.HALL_GROUP: return 'Hall Group'
      default: return 'Entity'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading timetable...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Timetable</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-100 px-2 py-1 text-xs font-medium text-red-800 rounded hover:bg-red-200"
                  >
                    Retry
                  </button>
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="bg-red-100 px-2 py-1 text-xs font-medium text-red-800 rounded hover:bg-red-200"
                    >
                      Go Back
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getEntityTypeLabel(entityType)} Timetable
            </h2>
            {entityName && (
              <p className="text-sm text-gray-500 mt-1">
                {entityName}
              </p>
            )}
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {getEntityTypeLabel(entityType)} List
            </button>
          )}
        </div>
      </div>

      {/* Timetable Editor */}
      {timetable && entityTiming && (
        <TimetableEditor
          entityId={entityId}
          entityType={entityType}
          timetable={timetable}
          entityTiming={entityTiming}
          onSave={handleSave}
          onCancel={onBack}
        />
      )}
    </div>
  )
}