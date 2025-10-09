'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { StudentGroup, StudentGroupFormData, EntityType } from '@/types'
import { StudentGroupForm } from './StudentGroupForm'
import { StudentGroupList } from './StudentGroupList'
import { StudentGroupMemberManager } from './StudentGroupMemberManager'
import TimetableManagement from './TimetableManagement'

export function StudentGroupManagement() {
  const { currentSession } = useSession()
  const [groups, setGroups] = useState<StudentGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null)
  const [managingGroup, setManagingGroup] = useState<StudentGroup | null>(null)
  const [viewingTimetable, setViewingTimetable] = useState<StudentGroup | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (currentSession) {
      loadGroups()
    }
  }, [currentSession]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroups = async () => {
    if (!currentSession) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/student-groups?sessionId=${currentSession.id}`)
      if (response.ok) {
        const data = await response.json()
        setGroups(data.data || [])
      } else {
        console.error('Failed to load student groups')
      }
    } catch (error) {
      console.error('Error loading student groups:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGroup = () => {
    setEditingGroup(null)
    setShowForm(true)
  }

  const handleEditGroup = (group: StudentGroup) => {
    setEditingGroup(group)
    setShowForm(true)
  }

  const handleDeleteGroup = async (group: StudentGroup) => {
    if (!confirm(`Are you sure you want to delete the student group "${group.groupName}"? This will also remove all member associations.`)) {
      return
    }

    try {
      const response = await fetch(`/api/student-groups/${group.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadGroups()
      } else {
        const error = await response.json()
        alert(error.error?.message || 'Failed to delete student group')
      }
    } catch (error) {
      console.error('Error deleting student group:', error)
      alert('Failed to delete student group')
    }
  }

  const handleManageMembers = (group: StudentGroup) => {
    setManagingGroup(group)
  }

  const handleViewTimetable = (group: StudentGroup) => {
    setViewingTimetable(group)
  }

  const handleFormSubmit = async (formData: StudentGroupFormData) => {
    if (!currentSession) return

    setIsSubmitting(true)
    try {
      const url = editingGroup
        ? `/api/student-groups/${editingGroup.id}`
        : '/api/student-groups'

      const method = editingGroup ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          sessionId: currentSession.id
        })
      })

      if (response.ok) {
        setShowForm(false)
        setEditingGroup(null)
        await loadGroups()
      } else {
        const error = await response.json()
        alert(error.error?.message || `Failed to ${editingGroup ? 'update' : 'create'} student group`)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert(`Failed to ${editingGroup ? 'update' : 'create'} student group`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingGroup(null)
  }

  const handleMembersUpdated = () => {
    loadGroups()
  }

  const handleBackFromTimetable = () => {
    setViewingTimetable(null)
  }

  if (!currentSession) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a session to manage student groups.</p>
      </div>
    )
  }

  // Show timetable view if a group is selected for timetable viewing
  if (viewingTimetable) {
    return (
      <TimetableManagement
        entityId={viewingTimetable.id}
        entityType={EntityType.STUDENT_GROUP}
        entityName={viewingTimetable.groupName}
        onBack={handleBackFromTimetable}
      />
    )
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Groups</h1>
            <p className="text-gray-600">
              Manage student groups for {currentSession.name}
            </p>
          </div>
          <button
            onClick={handleCreateGroup}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Student Group
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingGroup ? 'Edit Student Group' : 'Create Student Group'}
              </h2>
              <StudentGroupForm
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                initialData={editingGroup ? {
                  groupName: editingGroup.groupName,
                  startHour: editingGroup.startHour,
                  startMinute: editingGroup.startMinute,
                  endHour: editingGroup.endHour,
                  endMinute: editingGroup.endMinute
                } : undefined}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Member Manager Modal */}
        {managingGroup && currentSession && (
          <StudentGroupMemberManager
            group={managingGroup}
            sessionId={currentSession.id}
            onClose={() => setManagingGroup(null)}
            onMembersUpdated={handleMembersUpdated}
          />
        )}

        {/* Groups List */}
        <StudentGroupList
          groups={groups}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroup}
          onManageMembers={handleManageMembers}
          onViewTimetable={handleViewTimetable}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}