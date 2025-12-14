'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/contexts/SessionContext'
import { ApiResponse, Hall } from '@/types'

interface HallListProps {
  onHallSelect: (hall: Hall) => void
  onCreateNew: () => void
  onManageTimetable?: (hall: Hall) => void
  refreshTrigger?: number
}

export default function HallList({ onHallSelect, onCreateNew, onManageTimetable, refreshTrigger }: HallListProps) {
  const { currentSession } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [buildings, setBuildings] = useState<string[]>([])
  const [floors, setFloors] = useState<string[]>([])
  const limit = 10

  // Load search state from URL on mount
  useEffect(() => {
    const search = searchParams.get('search') || ''
    const building = searchParams.get('building') || ''
    const floor = searchParams.get('floor') || ''
    const page = parseInt(searchParams.get('page') || '1')
    setSearchTerm(search)
    setSelectedBuilding(building)
    setSelectedFloor(floor)
    setCurrentPage(page)
  }, [searchParams])

  const fetchHalls = async () => {
    if (!currentSession) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        sessionId: currentSession.id.toString(),
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedBuilding && { building: selectedBuilding }),
        ...(selectedFloor && { floor: selectedFloor })
      })

      const response = await fetch(`/api/halls?${params}`)
      const result: ApiResponse = await response.json()

      if (result.success && result.data) {
        setHalls(result.data.halls)
        setTotalPages(result.data.pagination.totalPages)
        setTotal(result.data.pagination.total)
        setBuildings(result.data.filters.buildings)
        setFloors(result.data.filters.floors)
      } else {
        setError(result.error?.message || 'Failed to fetch halls')
      }
    } catch (err) {
      setError('Failed to fetch halls')
      console.error('Error fetching halls:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHalls()
  }, [currentSession, currentPage, searchTerm, selectedBuilding, selectedFloor, refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateURL = (search?: string, building?: string, floor?: string, page?: number) => {
    const params = new URLSearchParams(searchParams)
    if (search !== undefined) {
      if (search) {
        params.set('search', search)
      } else {
        params.delete('search')
      }
    }
    if (building !== undefined) {
      if (building) {
        params.set('building', building)
      } else {
        params.delete('building')
      }
    }
    if (floor !== undefined) {
      if (floor) {
        params.set('floor', floor)
      } else {
        params.delete('floor')
      }
    }
    if (page !== undefined) {
      if (page > 1) {
        params.set('page', page.toString())
      } else {
        params.delete('page')
      }
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    updateURL(searchTerm, undefined, undefined, 1)
    fetchHalls()
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
    fetchHalls()
  }

  const handleDelete = async (hall: Hall) => {
    if (!confirm(`Are you sure you want to delete hall "${hall.name}" in ${hall.Building}, Floor ${hall.Floor}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/halls/${hall.id}`, {
        method: 'DELETE'
      })
      const result: ApiResponse = await response.json()

      if (result.success) {
        fetchHalls()
      } else {
        alert(result.error?.message || 'Failed to delete hall')
      }
    } catch (err) {
      alert('Failed to delete hall')
      console.error('Error deleting hall:', err)
    }
  }

  if (!currentSession) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please select a session to view halls
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Halls</h2>
          <p className="text-sm text-gray-600">
            {total} hall{total !== 1 ? 's' : ''} in {currentSession.name}
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Hall
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name or short form..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={selectedBuilding}
            onChange={(e) => {
              const newBuilding = e.target.value
              setSelectedBuilding(newBuilding)
              setCurrentPage(1)
              updateURL(undefined, newBuilding, undefined, 1)
              handleFilterChange()
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>

          <select
            value={selectedFloor}
            onChange={(e) => {
              const newFloor = e.target.value
              setSelectedFloor(newFloor)
              setCurrentPage(1)
              updateURL(undefined, undefined, newFloor, 1)
              handleFilterChange()
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Floors</option>
            {floors.map((floor) => (
              <option key={floor} value={floor}>
                Floor {floor}
              </option>
            ))}
          </select>

          {(selectedBuilding || selectedFloor) && (
            <button
              onClick={() => {
                setSelectedBuilding('')
                setSelectedFloor('')
                setCurrentPage(1)
                updateURL('', '', '', 1)
                handleFilterChange()
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading halls...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Hall List */}
      {!loading && !error && (
        <>
          {halls.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-2">🏛️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No halls found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedBuilding || selectedFloor 
                  ? 'No halls match your search criteria.' 
                  : 'Get started by adding your first hall.'}
              </p>
              <button
                onClick={onCreateNew}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Hall
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hall Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Short Form
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Courses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Groups
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {halls.map((hall) => (
                      <tr key={hall.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {hall.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {hall.Building}, Floor {hall.Floor}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {hall.shortForm || (
                              <span className="text-gray-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {hall.coursesTaught.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {hall.coursesTaught.slice(0, 2).map((course) => (
                                  <span
                                    key={course.id}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                  >
                                    {course.code}
                                  </span>
                                ))}
                                {hall.coursesTaught.length > 2 && (
                                  <span className="text-xs text-gray-500">
                                    +{hall.coursesTaught.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs">No courses</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {hall.hallGroupMemberships.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {hall.hallGroupMemberships.map((membership) => (
                                  <span
                                    key={membership.hallGroup.id}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {membership.hallGroup.groupName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs">No groups</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => onHallSelect(hall)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              Edit
                            </button>
                            {onManageTimetable && (
                              <button
                                onClick={() => onManageTimetable(hall)}
                                className="text-green-600 hover:text-green-900 transition-colors"
                              >
                                Timetable
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(hall)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, currentPage - 1)
                        setCurrentPage(newPage)
                        updateURL(undefined, undefined, undefined, newPage)
                      }}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        const newPage = Math.min(totalPages, currentPage + 1)
                        setCurrentPage(newPage)
                        updateURL(undefined, undefined, undefined, newPage)
                      }}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * limit, total)}
                        </span>{' '}
                        of <span className="font-medium">{total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => {
                            const newPage = Math.max(1, currentPage - 1)
                            setCurrentPage(newPage)
                            updateURL(undefined, undefined, undefined, newPage)
                          }}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let page
                          if (totalPages <= 5) {
                            page = i + 1
                          } else if (currentPage <= 3) {
                            page = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i
                          } else {
                            page = currentPage - 2 + i
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => {
                                setCurrentPage(page)
                                updateURL(undefined, undefined, undefined, page)
                              }}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        })}
                        <button
                          onClick={() => {
                            const newPage = Math.min(totalPages, currentPage + 1)
                            setCurrentPage(newPage)
                            updateURL(undefined, undefined, undefined, newPage)
                          }}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}