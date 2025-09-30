'use client'

import { useState, useEffect } from 'react'
import { Student, StudentGroup } from '@/types'

interface GroupMember {
  id: number
  studentId: number
  studentGroupId: number
  createdAt: string
  updatedAt: string
  student: Student
}

interface StudentGroupMemberManagerProps {
  group: StudentGroup
  sessionId: number
  onClose: () => void
  onMembersUpdated: () => void
}

export function StudentGroupMemberManager({
  group,
  sessionId,
  onClose,
  onMembersUpdated
}: StudentGroupMemberManagerProps) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current')

  useEffect(() => {
    loadData()
  }, [group.id, sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load current members
      const membersResponse = await fetch(`/api/student-groups/${group.id}/members`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData.data || [])
      }

      // Load all students in session
      const studentsResponse = await fetch(`/api/students?sessionId=${sessionId}`)
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        setAvailableStudents((studentsData.data.students) ? studentsData.data.students : [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const handleAddMembers = async () => {
    if (selectedStudents.length === 0) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/student-groups/${group.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentIds: selectedStudents
        })
      })

      if (response.ok) {
        setSelectedStudents([])
        await loadData()
        onMembersUpdated()
        setActiveTab('current')
      } else {
        const error = await response.json()
        alert(error.error?.message || 'Failed to add members')
      }
    } catch (error) {
      console.error('Error adding members:', error)
      alert('Failed to add members')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveMembers = async () => {
    if (selectedMembers.length === 0) return

    if (!confirm(`Are you sure you want to remove ${selectedMembers.length} member(s) from the group?`)) {
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/student-groups/${group.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentIds: selectedMembers
        })
      })

      if (response.ok) {
        setSelectedMembers([])
        await loadData()
        onMembersUpdated()
      } else {
        const error = await response.json()
        alert(error.error?.message || 'Failed to remove members')
      }
    } catch (error) {
      console.error('Error removing members:', error)
      alert('Failed to remove members')
    } finally {
      setIsUpdating(false)
    }
  }

  const currentMemberIds = new Set(members.map(m => m.student.id))
  const nonMembers = Array.isArray(availableStudents)
    ? availableStudents.filter(student => !currentMemberIds.has(student.id))
    : []

  const filteredMembers = members.filter(member =>
    member.student.digitalId.toString().includes(searchTerm)
  )

  const filteredNonMembers = nonMembers.filter(student =>
    student.digitalId.toString().includes(searchTerm)
  )

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Manage Members - {group.groupName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex space-x-1">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'current'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Current Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'add'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Add Members ({nonMembers.length} available)
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by Digital ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {activeTab === 'current' ? (
            <div>
              {/* Current Members */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Current Members</h3>
                {selectedMembers.length > 0 && (
                  <button
                    onClick={handleRemoveMembers}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Remove Selected ({selectedMembers.length})
                  </button>
                )}
              </div>

              {filteredMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? 'No members match your search.' : 'No members in this group.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, member.student.id])
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== member.student.id))
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Digital ID: {member.student.digitalId}</div>
                        <div className="text-sm text-gray-600">
                          Working Hours: {formatTime(member.student.startHour, member.student.startMinute)} - {formatTime(member.student.endHour, member.student.endMinute)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Added: {new Date(member.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Add Members */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Available Students</h3>
                {selectedStudents.length > 0 && (
                  <button
                    onClick={handleAddMembers}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Selected ({selectedStudents.length})
                  </button>
                )}
              </div>

              {filteredNonMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? 'No available students match your search.' : 'All students are already members of this group.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredNonMembers.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id])
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Digital ID: {student.digitalId}</div>
                        <div className="text-sm text-gray-600">
                          Working Hours: {formatTime(student.startHour, student.startMinute)} - {formatTime(student.endHour, student.endMinute)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}