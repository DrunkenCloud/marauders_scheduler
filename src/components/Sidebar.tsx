'use client'

import { useState } from 'react'
import { EntityType } from '@/types'

interface SidebarProps {
  activeEntity: EntityType | 'import-export' | null
  onEntitySelect: (entity: EntityType | 'import-export') => void
}



interface NavItem {
  type: EntityType | 'import-export'
  label: string
  icon: string
  description: string
}

const entityNavItems: NavItem[] = [
  {
    type: EntityType.STUDENT,
    label: 'Students',
    icon: '👨‍🎓',
    description: 'Manage student records and timetables'
  },
  {
    type: EntityType.FACULTY,
    label: 'Faculty',
    icon: '👨‍🏫',
    description: 'Manage faculty members and schedules'
  },
  {
    type: EntityType.HALL,
    label: 'Halls',
    icon: '🏛️',
    description: 'Manage classroom and hall bookings'
  },
  {
    type: EntityType.COURSE,
    label: 'Courses',
    icon: '📚',
    description: 'Manage course information and schedules'
  },
  {
    type: EntityType.STUDENT_GROUP,
    label: 'Student Groups',
    icon: '👥',
    description: 'Manage student group assignments'
  },
  {
    type: EntityType.FACULTY_GROUP,
    label: 'Faculty Groups',
    icon: '👨‍👩‍👧‍👦',
    description: 'Manage faculty group assignments'
  },
  {
    type: EntityType.HALL_GROUP,
    label: 'Hall Groups',
    icon: '🏢',
    description: 'Manage hall group assignments'
  },
  {
    type: EntityType.SCHEDULE_COURSES,
    label: 'Schedule Courses',
    icon: '📅',
    description: 'Schedule courses for all involved parties'
  },
  {
    type: 'import-export',
    label: 'Import / Export',
    icon: '📥',
    description: 'Import or export session data'
  }
]

export default function Sidebar({ activeEntity, onEntitySelect }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-800">Navigation</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2">
          <div className="space-y-1">
            {entityNavItems.map((item) => (
              <button
                key={item.type}
                onClick={() => onEntitySelect(item.type)}
                className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                  activeEntity === item.type
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={isCollapsed ? item.label : item.description}
              >
                <span className="text-xl mr-3 flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Select an entity type to manage records and timetables
            </div>
          </div>
        )}
      </div>
    </div>
  )
}