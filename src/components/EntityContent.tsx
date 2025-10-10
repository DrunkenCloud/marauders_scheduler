'use client'

import { EntityType } from '@/types'
import { useSession } from '@/contexts/SessionContext'
import StudentManagement from './StudentManagement'
import FacultyManagement from './FacultyManagement'
import HallManagement from './HallManagement'
import CourseManagement from './CourseManagement'
import { StudentGroupManagement } from './StudentGroupManagement'
import { FacultyGroupManagement } from './FacultyGroupManagement'
import { HallGroupManagement } from './HallGroupManagement'
import CourseScheduling from './CourseScheduling'

interface EntityContentProps {
  entityType: EntityType | null
}

const entityInfo = {
  [EntityType.STUDENT]: {
    title: 'Students',
    description: 'Manage student records and complete timetables',
    icon: '👨‍🎓',
    features: [
      'View and edit student information',
      'Manage complete student timetables',
      'All time slots must be defined (free or occupied)',
      'Track student course enrollments'
    ]
  },
  [EntityType.FACULTY]: {
    title: 'Faculty',
    description: 'Manage faculty members and their schedules',
    icon: '👨‍🏫',
    features: [
      'View and edit faculty information',
      'Manage partial faculty timetables',
      'Only occupied time slots need definition',
      'Track faculty course assignments'
    ]
  },
  [EntityType.HALL]: {
    title: 'Halls',
    description: 'Manage classroom and hall bookings',
    icon: '🏛️',
    features: [
      'View and edit hall information',
      'Manage hall availability schedules',
      'Track hall usage and bookings',
      'Organize by building and floor'
    ]
  },
  [EntityType.COURSE]: {
    title: 'Courses',
    description: 'Manage course information and schedules',
    icon: '📚',
    features: [
      'View and edit course details',
      'Configure scheduling requirements',
      'Set class duration and session counts',
      'Manage course timetables'
    ]
  },
  [EntityType.STUDENT_GROUP]: {
    title: 'Student Groups',
    description: 'Manage student group assignments and timetables',
    icon: '👥',
    features: [
      'Create and manage student groups',
      'Assign students to groups',
      'Create group timetables',
      'Apply timetables to all group members'
    ]
  },
  [EntityType.FACULTY_GROUP]: {
    title: 'Faculty Groups',
    description: 'Manage faculty group assignments and schedules',
    icon: '👨‍👩‍👧‍👦',
    features: [
      'Create and manage faculty groups',
      'Assign faculty to groups',
      'Create group timetables',
      'Manage group-based assignments'
    ]
  },
  [EntityType.HALL_GROUP]: {
    title: 'Hall Groups',
    description: 'Manage hall group assignments and bookings',
    icon: '🏢',
    features: [
      'Create and manage hall groups',
      'Assign halls to groups',
      'Create group timetables',
      'Organize halls by categories'
    ]
  },
  [EntityType.SCHEDULE_COURSES]: {
    title: 'Schedule Courses',
    description: 'Schedule courses for all involved parties',
    icon: '📅',
    features: [
      'Select courses to schedule',
      'Send scheduling requests',
      'Manage course scheduling',
      'Coordinate all parties'
    ]
  }
}

export default function EntityContent({ entityType }: EntityContentProps) {
  const { currentSession } = useSession()

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Session Selected</h2>
          <p className="text-gray-600 max-w-md">
            Please select a session from the dropdown above to start managing your college schedule data.
          </p>
        </div>
      </div>
    )
  }

  if (!entityType) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Admin Dashboard</h2>
          <p className="text-gray-600 max-w-md mb-6">
            Select an entity type from the sidebar to start managing your college schedule data.
          </p>
          <div className="text-sm text-gray-500">
            Current Session: <span className="font-medium text-gray-700">{currentSession.name}</span>
          </div>
        </div>
      </div>
    )
  }

  const info = entityInfo[entityType]

  // Return specific management component for students
  if (entityType === EntityType.STUDENT) {
    return <StudentManagement />
  }

  // Return specific management component for faculty
  if (entityType === EntityType.FACULTY) {
    return <FacultyManagement />
  }

  // Return specific management component for halls
  if (entityType === EntityType.HALL) {
    return <HallManagement />
  }

  // Return specific management component for courses
  if (entityType === EntityType.COURSE) {
    return <CourseManagement />
  }

  // Return specific management component for student groups
  if (entityType === EntityType.STUDENT_GROUP) {
    return <StudentGroupManagement />
  }

  // Return specific management component for faculty groups
  if (entityType === EntityType.FACULTY_GROUP) {
    return <FacultyGroupManagement />
  }

  // Return specific management component for hall groups
  if (entityType === EntityType.HALL_GROUP) {
    return <HallGroupManagement />
  }

  // Return specific component for course scheduling
  if (entityType === EntityType.SCHEDULE_COURSES) {
    return <CourseScheduling />
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{info.icon}</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{info.title}</h1>
            <p className="text-lg text-gray-600">{info.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Features</h3>
              <ul className="space-y-2">
                {info.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Session:</span>
                  <span className="font-medium text-gray-900">{currentSession.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(currentSession.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {currentSession.details && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Description:</span>
                    <p className="text-gray-900 mt-1">{currentSession.details}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900">Coming Soon</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Full CRUD operations and timetable management for {info.title.toLowerCase()} will be implemented in upcoming tasks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}