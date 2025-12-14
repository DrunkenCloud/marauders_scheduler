'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { HallGroup } from '@/types'

interface HallGroupListProps {
  groups: HallGroup[]
  onEdit: (group: HallGroup) => void
  onDelete: (group: HallGroup) => void
  onManageMembers: (group: HallGroup) => void
  onViewTimetable: (group: HallGroup) => void
  isLoading?: boolean
}

export function HallGroupList({ groups, onEdit, onDelete, onManageMembers, onViewTimetable, isLoading }: HallGroupListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'groupName' | 'memberCount' | 'createdAt'>('groupName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Load search state from URL on mount
  useEffect(() => {
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') as typeof sortBy || 'groupName'
    const order = searchParams.get('order') as typeof sortOrder || 'asc'
    setSearchTerm(search)
    setSortBy(sort)
    setSortOrder(order)
  }, [searchParams])

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  // Get unique buildings from group members for display
  const getGroupBuildings = (group: HallGroup): string[] => {
    if (!group.hallMemberships) return []
    const buildings = new Set(group.hallMemberships.map(m => m.hall.Building))
    return Array.from(buildings).sort()
  }

  const filteredAndSortedGroups = groups
    .filter(group =>
      group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'groupName':
          aValue = a.groupName.toLowerCase()
          bValue = b.groupName.toLowerCase()
          break
        case 'memberCount':
          aValue = a._count.hallMemberships
          bValue = b._count.hallMemberships
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  const updateURL = (search?: string, sort?: typeof sortBy, order?: typeof sortOrder) => {
    const params = new URLSearchParams(searchParams)
    if (search !== undefined) {
      if (search) {
        params.set('search', search)
      } else {
        params.delete('search')
      }
    }
    if (sort !== undefined) {
      params.set('sort', sort)
    }
    if (order !== undefined) {
      params.set('order', order)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
      setSortOrder(newOrder)
      updateURL(undefined, field, newOrder)
    } else {
      setSortBy(field)
      setSortOrder('asc')
      updateURL(undefined, field, 'asc')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search hall groups..."
            value={searchTerm}
            onChange={(e) => {
              const newSearch = e.target.value
              setSearchTerm(newSearch)
              updateURL(newSearch)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
              setSortBy(field)
              setSortOrder(order)
              updateURL(undefined, field, order)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="groupName-asc">Name (A-Z)</option>
            <option value="groupName-desc">Name (Z-A)</option>
            <option value="memberCount-desc">Most Halls</option>
            <option value="memberCount-asc">Least Halls</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedGroups.length} of {groups.length} hall groups
      </div>

      {/* Groups List */}
      {filteredAndSortedGroups.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No hall groups match your search.' : 'No hall groups found.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedGroups.map((group) => {
            const buildings = getGroupBuildings(group)
            return (
              <div
                key={group.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {group.groupName}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {group._count.hallMemberships} halls
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        Availability: {formatTime(group.startHour, group.startMinute)} - {formatTime(group.endHour, group.endMinute)}
                      </div>
                      {buildings.length > 0 && (
                        <div>
                          Buildings: {buildings.join(', ')}
                        </div>
                      )}
                      <div>
                        Created: {new Date(group.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => onViewTimetable(group)}
                      className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      View Timetable
                    </button>
                    <button
                      onClick={() => onManageMembers(group)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Manage Halls
                    </button>
                    <button
                      onClick={() => onEdit(group)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(group)}
                      className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}