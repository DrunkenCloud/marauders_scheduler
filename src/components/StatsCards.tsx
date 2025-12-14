'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/contexts/SessionContext'
import { ApiResponse, DashboardStats, StatCard } from '@/types'

export default function StatsCards() {
  const { currentSession } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentSession) {
        setStats(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${basePath}/api/stats?sessionId=${currentSession.id}`)
        const result: ApiResponse<DashboardStats> = await response.json()

        if (result.success && result.data) {
          setStats(result.data)
        } else {
          setError(result.error?.message || 'Failed to fetch statistics')
        }
      } catch (err) {
        setError('Failed to fetch statistics')
        console.error('Error fetching stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [currentSession, basePath])

  if (!currentSession) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-yellow-800">Please select a session to view statistics</span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-red-800">{error}</span>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const statCards: StatCard[] = [
    {
      label: 'Students',
      value: stats.students,
      icon: '👨‍🎓',
      color: 'bg-blue-500',
      description: 'Total students enrolled'
    },
    {
      label: 'Faculty',
      value: stats.faculty,
      icon: '👨‍🏫',
      color: 'bg-green-500',
      description: 'Faculty members'
    },
    {
      label: 'Halls',
      value: stats.halls,
      icon: '🏛️',
      color: 'bg-purple-500',
      description: 'Available halls'
    },
    {
      label: 'Courses',
      value: stats.courses,
      icon: '📚',
      color: 'bg-orange-500',
      description: 'Active courses'
    },
    {
      label: 'Student Groups',
      value: stats.studentGroups,
      icon: '👥',
      color: 'bg-cyan-500',
      description: 'Student groups'
    },
    {
      label: 'Faculty Groups',
      value: stats.facultyGroups,
      icon: '👨‍👩‍👧‍👦',
      color: 'bg-indigo-500',
      description: 'Faculty groups'
    },
    {
      label: 'Hall Groups',
      value: stats.hallGroups,
      icon: '🏢',
      color: 'bg-pink-500',
      description: 'Hall groups'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.description}</p>
            </div>
            <div className={`${card.color} rounded-full p-3 text-white text-2xl`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}