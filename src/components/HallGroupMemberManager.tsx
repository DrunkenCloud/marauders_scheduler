'use client'

import { useState, useEffect } from 'react'
import { Hall, HallGroup } from '@/types'

interface GroupMember {
  id: string
  hallId: string
  hallGroupId: string
  createdAt: string
  updatedAt: string
  hall: Hall
}

interface HallGroupMemberManagerProps {
  group: HallGroup
  sessionId: string
  onClose: () => void
  onMembersUpdated: () => void
}

export function HallGroupMemberManager({ 
  group, 
  sessionId, 
  onClose, 
  onMembersUpdated 
}: HallGroupMemberManagerProps) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [availableHalls, setAvailableHalls] = useState<Hall[]>([])
  const [selectedHalls, setSelectedHalls] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current')
  const [buildingFilter, setBuildingFilter] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [group.id, sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load current members
      const membersResponse = await fetch(`/api/hall-groups/${group.id}/members`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData.data || [])
      }

      // Load all halls in session
      const hallsResponse = await fetch(`/api/halls?sessionId=${sessionId}`)
      if (hallsResponse.ok) {
        const hallsData = await hallsResponse.json()
        setAvailableHalls(hallsData.data.halls || [])
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
    if (selectedHalls.length === 0) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/hall-groups/${group.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hallIds: selectedHalls
        })
      })

      if (response.ok) {
        setSelectedHalls([])
        await loadData()
        onMembersUpdated()
        setActiveTab('current')
      } else {
        const error = await response.json()
        alert(error.error?.message || 'Failed to add halls')
      }
    } catch (error) {
      console.error('Error adding halls:', error)
      alert('Failed to add halls')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveMembers = async () => {
    if (selectedMembers.length === 0) return

    if (!confirm(`Are you sure you want to remove ${selectedMembers.length} hall(s) from the group?`)) {
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/hall-groups/${group.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hallIds: selectedMembers
        })
      })

      if (response.ok) {
        setSelectedMembers([])
        await loadData()
        onMembersUpdated()
      } else {
        const error = await response.json()
        alert(error.error?.message || 'Failed to remove halls')
      }
    } catch (error) {
      console.error('Error removing halls:', error)
      alert('Failed to remove halls')
    } finally {
      setIsUpdating(false)
    }
  }

  const currentMemberIds = new Set(members.map(m => m.hall.id))
  const nonMembers = availableHalls.filter(hall => !currentMemberIds.has(hall.id))

  // Get unique buildings for filter
  const allBuildings = Array.from(new Set(availableHalls.map(hall => hall.Building))).sort()

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.hall.Building.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.hall.Floor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.hall.shortForm && member.hall.shortForm.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesBuilding = !buildingFilter || member.hall.Building === buildingFilter
    
    return matchesSearch && matchesBuilding
  })

  const filteredNonMembers = nonMembers.filter(hall => {
    const matchesSearch = hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hall.Building.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hall.Floor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hall.shortForm && hall.shortForm.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesBuilding = !buildingFilter || hall.Building === buildingFilter
    
    return matchesSearch && matchesBuilding
  })

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Manage Halls - {group.groupName}
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
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'current'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Current Halls ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'add'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Add Halls ({nonMembers.length} available)
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Search and Filters */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, building, floor, or short form..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Buildings</option>
                {allBuildings.map(building => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>
            </div>
          </div>

          {activeTab === 'current' ? (
            <div>
              {/* Current Members */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Current Halls</h3>
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
                  {searchTerm || buildingFilter ? 'No halls match your filters.' : 'No halls in this group.'}
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
                        checked={selectedMembers.includes(member.hall.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, member.hall.id])
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== member.hall.id))
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {member.hall.name}
                          {member.hall.shortForm && (
                            <span className="text-gray-500 ml-2">({member.hall.shortForm})</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.hall.Building}, Floor {member.hall.Floor} • 
                          Available: {formatTime(member.hall.startHour, member.hall.startMinute)} - {formatTime(member.hall.endHour, member.hall.endMinute)}
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
                <h3 className="text-lg font-medium">Available Halls</h3>
                {selectedHalls.length > 0 && (
                  <button
                    onClick={handleAddMembers}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Selected ({selectedHalls.length})
                  </button>
                )}
              </div>

              {filteredNonMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm || buildingFilter ? 'No available halls match your filters.' : 'All halls are already in this group.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredNonMembers.map((hall) => (
                    <div
                      key={hall.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHalls.includes(hall.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHalls([...selectedHalls, hall.id])
                          } else {
                            setSelectedHalls(selectedHalls.filter(id => id !== hall.id))
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {hall.name}
                          {hall.shortForm && (
                            <span className="text-gray-500 ml-2">({hall.shortForm})</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {hall.Building}, Floor {hall.Floor} • 
                          Available: {formatTime(hall.startHour, hall.startMinute)} - {formatTime(hall.endHour, hall.endMinute)}
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