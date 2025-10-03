'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { EntityType, EntityTimetable, TimetableSlot, Course, Faculty, Hall, EntityTiming, StudentGroup, FacultyGroup, HallGroup, Student } from '@/types'
import { DAYS_OF_WEEK, validateTimetable } from '@/lib/timetable'
import { useSession } from '@/contexts/SessionContext'

interface TimetableEditorProps {
  entityId: number
  entityType: EntityType
  timetable?: EntityTimetable
  entityTiming?: EntityTiming
  onSave: (timetable: EntityTimetable) => Promise<void>
  onCancel?: () => void
  readOnly?: boolean
}

export default function TimetableEditor({
  entityId,
  entityType,
  timetable: initialTimetable,
  entityTiming,
  onSave,
  onCancel,
  readOnly = false
}: TimetableEditorProps) {
  const { currentSession } = useSession()
  const [timetable, setTimetable] = useState<EntityTimetable | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{
    day: string
    slot: TimetableSlot
    slotIndex: number
  } | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Slot editor form state
  const [editingSlot, setEditingSlot] = useState<TimetableSlot>({
    status: 1,
    startHour: 8,
    startMinute: 0,
    duration: 50,
    courseCode: '',
    facultyIds: [],
    hallIds: [],
    facultyGroupIds: [],
    hallGroupIds: [],
    studentIds: [],
    studentGroupIds: []
  })
  const [selectedDay, setSelectedDay] = useState<string>('Monday')

  // Reference data
  const [facultyGroups, setFacultyGroups] = useState<FacultyGroup[]>([])
  const [hallGroups, setHallGroups] = useState<HallGroup[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [conflicts, setConflicts] = useState<string[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // Initialize timetable
  useEffect(() => {
    if (initialTimetable) {
      setTimetable(initialTimetable)
    } else if (currentSession && entityTiming) {
      // Create empty timetable
      const emptyTimetable: EntityTimetable = {
        entityId,
        entityType,
        schedule: {},
        isComplete: false
      }

      // Initialize all days with empty arrays
      DAYS_OF_WEEK.forEach(day => {
        emptyTimetable.schedule[day] = []
      })

      setTimetable(emptyTimetable)
    }
  }, [initialTimetable, entityId, entityType, currentSession, entityTiming])

  // Load reference data for slot editor
  useEffect(() => {
    if (!currentSession) return

    const loadReferenceData = async () => {
      setLoading(true)
      try {
        const [coursesRes, facultyRes, hallsRes, facultyGroupsRes, hallGroupsRes, studentsRes, studentGroupsRes] = await Promise.all([
          fetch(`/api/courses?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/faculty?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/halls?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/faculty-groups?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/hall-groups?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/students?sessionId=${currentSession.id}&limit=1000`),
          fetch(`/api/student-groups?sessionId=${currentSession.id}&limit=1000`)
        ])

        const [coursesData, facultyData, hallsData, facultyGroupsData, hallGroupsData, studentsData, studentGroupsData] = await Promise.all([
          coursesRes.json(),
          facultyRes.json(),
          hallsRes.json(),
          facultyGroupsRes.json(),
          hallGroupsRes.json(),
          studentsRes.json(),
          studentGroupsRes.json()
        ])

        if (coursesData.success) setCourses(coursesData.data.courses || [])
        if (facultyData.success) setFaculty(facultyData.data.faculty || [])
        if (hallsData.success) setHalls(hallsData.data.halls || [])
        if (facultyGroupsData.success) setFacultyGroups(facultyGroupsData.data.facultyGroups || [])
        if (hallGroupsData.success) setHallGroups(hallGroupsData.data.hallGroups || [])
        if (studentsData.success) setStudents(studentsData.data.students || [])
        if (studentGroupsData.success) setStudentGroups(studentGroupsData.data.studentGroups || [])
      } catch (error) {
        console.error('Error loading reference data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReferenceData()
  }, [currentSession])

  // Check for conflicts when adding/updating slots
  const checkConflicts = useCallback(async (slot: TimetableSlot, day: string, excludeSlotIndex?: number): Promise<string[]> => {
    if (!currentSession) return []

    const conflicts: string[] = []
    const slotStart = slot.startHour * 60 + slot.startMinute
    const slotEnd = slotStart + slot.duration

    // Helper function to check if a slot is the same as the one being edited
    const isSameSlot = (existingSlot: any, originalSlot: TimetableSlot) => {
      return existingSlot.startHour === originalSlot.startHour &&
        existingSlot.startMinute === originalSlot.startMinute &&
        existingSlot.duration === originalSlot.duration &&
        existingSlot.courseCode === originalSlot.courseCode
    }

    // Get the original slot being edited (if any)
    const originalSlot = selectedSlot?.slot

    try {
      // Check faculty conflicts
      if (slot.facultyIds && slot.facultyIds.length > 0) {
        for (const facultyId of slot.facultyIds) {
          const response = await fetch(`/api/timetables?entityType=faculty&entityId=${facultyId}&sessionId=${currentSession.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.timetable) {
              const daySlots = data.data.timetable.schedule[day] || []
              for (let i = 0; i < daySlots.length; i++) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'status' in existingSlot && existingSlot.status > 0) {
                  // Skip if this is the same slot we're editing
                  if (originalSlot && isSameSlot(existingSlot, originalSlot)) {
                    continue
                  }

                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  const existingEnd = existingStart + existingSlot.duration

                  if (slotStart < existingEnd && slotEnd > existingStart) {
                    const facultyName = faculty.find(f => f.id === facultyId)?.name || `Faculty ${facultyId}`
                    conflicts.push(`${facultyName} is already occupied from ${formatTime(existingSlot.startHour, existingSlot.startMinute)} to ${formatTime(Math.floor(existingEnd / 60), existingEnd % 60)}`)
                  }
                }
              }
            }
          }
        }
      }

      // Check hall conflicts
      if (slot.hallIds && slot.hallIds.length > 0) {
        for (const hallId of slot.hallIds) {
          const response = await fetch(`/api/timetables?entityType=hall&entityId=${hallId}&sessionId=${currentSession.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.timetable) {
              const daySlots = data.data.timetable.schedule[day] || []
              for (let i = 0; i < daySlots.length; i++) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'status' in existingSlot && existingSlot.status > 0) {
                  // Skip if this is the same slot we're editing
                  if (originalSlot && isSameSlot(existingSlot, originalSlot)) {
                    continue
                  }

                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  const existingEnd = existingStart + existingSlot.duration

                  if (slotStart < existingEnd && slotEnd > existingStart) {
                    const hallName = halls.find(h => h.id === hallId)?.name || `Hall ${hallId}`
                    conflicts.push(`${hallName} is already occupied from ${formatTime(existingSlot.startHour, existingSlot.startMinute)} to ${formatTime(Math.floor(existingEnd / 60), existingEnd % 60)}`)
                  }
                }
              }
            }
          }
        }
      }

      // Check faculty group conflicts
      if (slot.facultyGroupIds && slot.facultyGroupIds.length > 0) {
        for (const groupId of slot.facultyGroupIds) {
          const response = await fetch(`/api/timetables?entityType=facultyGroup&entityId=${groupId}&sessionId=${currentSession.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.timetable) {
              const daySlots = data.data.timetable.schedule[day] || []
              for (let i = 0; i < daySlots.length; i++) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'status' in existingSlot && existingSlot.status > 0) {
                  // Skip if this is the same slot we're editing
                  if (originalSlot && isSameSlot(existingSlot, originalSlot)) {
                    continue
                  }

                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  const existingEnd = existingStart + existingSlot.duration

                  if (slotStart < existingEnd && slotEnd > existingStart) {
                    const groupName = facultyGroups.find(g => g.id === groupId)?.groupName || `Faculty Group ${groupId}`
                    conflicts.push(`${groupName} is already occupied from ${formatTime(existingSlot.startHour, existingSlot.startMinute)} to ${formatTime(Math.floor(existingEnd / 60), existingEnd % 60)}`)
                  }
                }
              }
            }
          }
        }
      }

      // Check hall group conflicts
      if (slot.hallGroupIds && slot.hallGroupIds.length > 0) {
        for (const groupId of slot.hallGroupIds) {
          const response = await fetch(`/api/timetables?entityType=hallGroup&entityId=${groupId}&sessionId=${currentSession.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.timetable) {
              const daySlots = data.data.timetable.schedule[day] || []
              for (let i = 0; i < daySlots.length; i++) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'status' in existingSlot && existingSlot.status > 0) {
                  // Skip if this is the same slot we're editing
                  if (originalSlot && isSameSlot(existingSlot, originalSlot)) {
                    continue
                  }

                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  const existingEnd = existingStart + existingSlot.duration

                  if (slotStart < existingEnd && slotEnd > existingStart) {
                    const groupName = hallGroups.find(g => g.id === groupId)?.groupName || `Hall Group ${groupId}`
                    conflicts.push(`${groupName} is already occupied from ${formatTime(existingSlot.startHour, existingSlot.startMinute)} to ${formatTime(Math.floor(existingEnd / 60), existingEnd % 60)}`)
                  }
                }
              }
            }
          }
        }
      }

      // Check student conflicts
      if (slot.studentIds && slot.studentIds.length > 0) {
        for (const studentId of slot.studentIds) {
          const response = await fetch(`/api/timetables?entityType=student&entityId=${studentId}&sessionId=${currentSession.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.timetable) {
              const daySlots = data.data.timetable.schedule[day] || []
              for (let i = 0; i < daySlots.length; i++) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'status' in existingSlot && existingSlot.status > 0) {
                  // Skip if this is the same slot we're editing
                  if (originalSlot && isSameSlot(existingSlot, originalSlot)) {
                    continue
                  }

                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  const existingEnd = existingStart + existingSlot.duration

                  if (slotStart < existingEnd && slotEnd > existingStart) {
                    const studentName = students.find(s => s.id === studentId)?.digitalId || `Student ${studentId}`
                    conflicts.push(`Student ${studentName} is already occupied from ${formatTime(existingSlot.startHour, existingSlot.startMinute)} to ${formatTime(Math.floor(existingEnd / 60), existingEnd % 60)}`)
                  }
                }
              }
            }
          }
        }
      }

      // Check student group conflicts
      if (slot.studentGroupIds && slot.studentGroupIds.length > 0) {
        for (const groupId of slot.studentGroupIds) {
          const response = await fetch(`/api/timetables?entityType=studentGroup&entityId=${groupId}&sessionId=${currentSession.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.timetable) {
              const daySlots = data.data.timetable.schedule[day] || []
              for (let i = 0; i < daySlots.length; i++) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'status' in existingSlot && existingSlot.status > 0) {
                  // Skip if this is the same slot we're editing
                  if (originalSlot && isSameSlot(existingSlot, originalSlot)) {
                    continue
                  }

                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  const existingEnd = existingStart + existingSlot.duration

                  if (slotStart < existingEnd && slotEnd > existingStart) {
                    const groupName = studentGroups.find(g => g.id === groupId)?.groupName || `Student Group ${groupId}`
                    conflicts.push(`${groupName} is already occupied from ${formatTime(existingSlot.startHour, existingSlot.startMinute)} to ${formatTime(Math.floor(existingEnd / 60), existingEnd % 60)}`)
                  }
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Error checking conflicts:', error)
      conflicts.push('Error checking conflicts. Please try again.')
    }

    return conflicts
  }, [currentSession, faculty, halls, facultyGroups, hallGroups, students, studentGroups, selectedSlot])

  // Calculate timeline dimensions and positions
  const getTimelineWidth = () => {
    if (!entityTiming) return 1200
    const totalMinutes = (entityTiming.endHour * 60 + entityTiming.endMinute) - (entityTiming.startHour * 60 + entityTiming.startMinute)
    return Math.max(1200, totalMinutes * 3) // 3px per minute for better visibility
  }

  const getSlotPosition = (slot: TimetableSlot) => {
    if (!entityTiming) return { left: 0, width: 100 }

    const timelineStart = entityTiming.startHour * 60 + entityTiming.startMinute
    const slotStart = slot.startHour * 60 + slot.startMinute
    const timelineWidth = getTimelineWidth()
    const totalMinutes = (entityTiming.endHour * 60 + entityTiming.endMinute) - timelineStart

    const left = ((slotStart - timelineStart) / totalMinutes) * timelineWidth
    const width = (slot.duration / totalMinutes) * timelineWidth

    return { left: Math.max(0, left), width: Math.max(20, width) }
  }

  const getTimeFromPosition = (x: number) => {
    if (!entityTiming) return { hour: 8, minute: 0 }

    const timelineWidth = getTimelineWidth()
    const totalMinutes = (entityTiming.endHour * 60 + entityTiming.endMinute) - (entityTiming.startHour * 60 + entityTiming.startMinute)
    const timelineStart = entityTiming.startHour * 60 + entityTiming.startMinute

    const minutesFromStart = (x / timelineWidth) * totalMinutes
    const totalMinutesFromMidnight = timelineStart + minutesFromStart

    const hour = Math.floor(totalMinutesFromMidnight / 60)
    const minute = Math.floor(totalMinutesFromMidnight % 60)

    return { hour: Math.max(0, Math.min(23, hour)), minute: Math.max(0, Math.min(59, minute)) }
  }

  const handleSlotClick = (day: string, slotIndex: number) => {
    if (readOnly || !timetable) return

    const daySlots = timetable.schedule[day] || []
    const slot = daySlots[slotIndex]

    if (slot && typeof slot === 'object' && 'status' in slot) {
      const tSlot = slot as TimetableSlot
      setSelectedSlot({ day, slotIndex, slot: tSlot })
      setEditingSlot({
        ...tSlot,
        facultyIds: tSlot.facultyIds || [],
        hallIds: tSlot.hallIds || [],
        facultyGroupIds: tSlot.facultyGroupIds || [],
        hallGroupIds: tSlot.hallGroupIds || [],
        studentIds: tSlot.studentIds || [],
        studentGroupIds: tSlot.studentGroupIds || []
      })
      setSelectedDay(day)
      setConflicts([])
    }
  }

  const handleTimelineClick = (day: string, event: React.MouseEvent) => {
    if (readOnly || !timetable || !entityTiming) return

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event.clientX - rect.left
    const { hour, minute } = getTimeFromPosition(x)

    // Create new slot at clicked position
    const newSlot: TimetableSlot = {
      status: 1,
      startHour: hour,
      startMinute: minute,
      duration: 50,
      courseCode: '',
      facultyIds: [],
      hallIds: [],
      facultyGroupIds: [],
      hallGroupIds: [],
      studentIds: [],
      studentGroupIds: []
    }

    setSelectedSlot({ day, slotIndex: -1, slot: newSlot })
    setEditingSlot(newSlot)
    setSelectedDay(day)
    setConflicts([])
  }

  const handleAddSlot = async () => {
    if (!timetable || !currentSession) return

    // Check for conflicts first
    setCheckingConflicts(true)
    const conflictList = await checkConflicts(editingSlot, selectedDay)
    setConflicts(conflictList)
    setCheckingConflicts(false)

    if (conflictList.length > 0 && editingSlot.status !== 0) {
      // Show conflicts but allow user to proceed if they want
      const proceed = confirm(`Conflicts detected:\n${conflictList.join('\n')}\n\nDo you want to proceed anyway?`)
      if (!proceed) return
    }

    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }

    if (!newTimetable.schedule[selectedDay]) {
      newTimetable.schedule[selectedDay] = []
    }

    const daySlots = [...newTimetable.schedule[selectedDay]]
    daySlots.push({ ...editingSlot })

    // Sort by start time
    daySlots.sort((a, b) => {
      if (typeof a === 'object' && 'startHour' in a && typeof b === 'object' && 'startHour' in b) {
        const aTime = a.startHour * 60 + a.startMinute
        const bTime = b.startHour * 60 + b.startMinute
        return aTime - bTime
      }
      return 0
    })

    newTimetable.schedule[selectedDay] = daySlots
    setTimetable(newTimetable)

    // Update all related entity timetables if slot is occupied
    if (editingSlot.status > 0) {
      await updateRelatedTimetables(editingSlot, selectedDay, 'add')
    }

    // Reset form
    setEditingSlot({
      status: 1,
      startHour: 8,
      startMinute: 0,
      duration: 50,
      courseCode: '',
      facultyIds: [],
      hallIds: [],
      facultyGroupIds: [],
      hallGroupIds: [],
      studentIds: [],
      studentGroupIds: []
    })
    setConflicts([])
  }

  const handleUpdateSlot = async () => {
    if (!timetable || !selectedSlot || !currentSession) return

    // Check for conflicts first
    setCheckingConflicts(true)
    const conflictList = await checkConflicts(editingSlot, selectedSlot.day, selectedSlot.slotIndex)
    setConflicts(conflictList)
    setCheckingConflicts(false)

    if (conflictList.length > 0 && editingSlot.status !== 0) {
      // Show conflicts but allow user to proceed if they want
      const proceed = confirm(`Conflicts detected:\n${conflictList.join('\n')}\n\nDo you want to proceed anyway?`)
      if (!proceed) return
    }

    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }
    const daySlots = [...(newTimetable.schedule[selectedSlot.day] || [])]

    if (selectedSlot.slotIndex >= 0 && selectedSlot.slotIndex < daySlots.length) {
      const oldSlot = daySlots[selectedSlot.slotIndex] as TimetableSlot
      daySlots[selectedSlot.slotIndex] = { ...editingSlot }

      // Sort by start time
      daySlots.sort((a, b) => {
        if (typeof a === 'object' && 'startHour' in a && typeof b === 'object' && 'startHour' in b) {
          const aTime = a.startHour * 60 + a.startMinute
          const bTime = b.startHour * 60 + b.startMinute
          return aTime - bTime
        }
        return 0
      })

      newTimetable.schedule[selectedSlot.day] = daySlots
      setTimetable(newTimetable)

      // Update all related entity timetables
      if (oldSlot.status > 0) {
        await updateRelatedTimetables(oldSlot, selectedSlot.day, 'remove')
      }
      if (editingSlot.status > 0) {
        await updateRelatedTimetables(editingSlot, selectedSlot.day, 'add')
      }
    }

    setSelectedSlot(null)
    setConflicts([])
  }

  // Update related entity timetables when adding/removing slots
  const updateRelatedTimetables = async (slot: TimetableSlot, day: string, action: 'add' | 'remove') => {
    if (!currentSession) return

    const allEntityIds = [
      ...(slot.facultyIds || []).map(id => ({ type: 'faculty', id })),
      ...(slot.hallIds || []).map(id => ({ type: 'hall', id })),
      ...(slot.facultyGroupIds || []).map(id => ({ type: 'facultyGroup', id })),
      ...(slot.hallGroupIds || []).map(id => ({ type: 'hallGroup', id })),
      ...(slot.studentIds || []).map(id => ({ type: 'student', id })),
      ...(slot.studentGroupIds || []).map(id => ({ type: 'studentGroup', id }))
    ]

    for (const entity of allEntityIds) {
      try {
        // Get current timetable
        const response = await fetch(`/api/timetables?entityType=${entity.type}&entityId=${entity.id}&sessionId=${currentSession.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const entityTimetable = data.data.timetable || {
              entityId: entity.id,
              entityType: entity.type,
              schedule: {},
              isComplete: false
            }

            // Initialize day if needed
            if (!entityTimetable.schedule[day]) {
              entityTimetable.schedule[day] = []
            }

            const daySlots = [...entityTimetable.schedule[day]]

            if (action === 'add') {
              // Add the slot
              daySlots.push({ ...slot })
              // Sort by start time
              daySlots.sort((a, b) => {
                if (typeof a === 'object' && 'startHour' in a && typeof b === 'object' && 'startHour' in b) {
                  const aTime = a.startHour * 60 + a.startMinute
                  const bTime = b.startHour * 60 + b.startMinute
                  return aTime - bTime
                }
                return 0
              })
            } else {
              // Remove matching slots
              const slotStart = slot.startHour * 60 + slot.startMinute
              for (let i = daySlots.length - 1; i >= 0; i--) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'startHour' in existingSlot) {
                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  if (existingStart === slotStart && existingSlot.duration === slot.duration && existingSlot.courseCode === slot.courseCode) {
                    daySlots.splice(i, 1)
                  }
                }
              }
            }

            entityTimetable.schedule[day] = daySlots

            // Save updated timetable
            await fetch('/api/timetables', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType: entity.type,
                entityId: entity.id,
                sessionId: currentSession.id,
                timetable: entityTimetable
              })
            })
          }
        }
      } catch (error) {
        console.error(`Error updating ${entity.type} ${entity.id} timetable:`, error)
      }
    }
  }

  const handleSlotDelete = (day: string, slotIndex: number) => {
    if (!timetable) return

    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }
    const daySlots = [...(newTimetable.schedule[day] || [])]

    if (slotIndex >= 0 && slotIndex < daySlots.length) {
      daySlots.splice(slotIndex, 1)
      newTimetable.schedule[day] = daySlots
      setTimetable(newTimetable)
    }

    // Clear selection if deleted slot was selected
    if (selectedSlot && selectedSlot.day === day && selectedSlot.slotIndex === slotIndex) {
      setSelectedSlot(null)
    }
  }

  const handleSave = async () => {
    if (!timetable) return

    // Validate timetable
    const validation = validateTimetable(timetable)
    if (!validation.isValid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`)
      return
    }

    setSaving(true)
    try {
      await onSave(timetable)
    } catch (error) {
      console.error('Error saving timetable:', error)
      alert('Failed to save timetable. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getSlotColor = (slot: TimetableSlot): string => {
    if (slot.status === 0) return 'bg-green-100 border-green-300 hover:bg-green-200'
    return 'bg-blue-100 border-blue-300 hover:bg-blue-200'
  }

  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  const generateTimeMarkers = () => {
    if (!entityTiming) return []

    const markers = []
    const startMinutes = entityTiming.startHour * 60 + entityTiming.startMinute
    const endMinutes = entityTiming.endHour * 60 + entityTiming.endMinute
    const timelineWidth = getTimelineWidth()
    const totalMinutes = endMinutes - startMinutes

    // Generate markers every 30 minutes
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      const position = ((minutes - startMinutes) / totalMinutes) * timelineWidth

      markers.push({
        time: formatTime(hour, minute),
        position
      })
    }

    return markers
  }

  // Check conflicts when form changes
  useEffect(() => {
    if (editingSlot.status > 0 && (editingSlot.facultyIds?.length || editingSlot.hallIds?.length || editingSlot.facultyGroupIds?.length || editingSlot.hallGroupIds?.length || editingSlot.studentIds?.length || editingSlot.studentGroupIds?.length)) {
      const checkConflictsDebounced = setTimeout(async () => {
        setCheckingConflicts(true)
        const conflictList = await checkConflicts(editingSlot, selectedDay)
        setConflicts(conflictList)
        setCheckingConflicts(false)
      }, 500)

      return () => clearTimeout(checkConflictsDebounced)
    } else {
      setConflicts([])
    }
  }, [editingSlot, selectedDay, checkConflicts])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading timetable editor...</div>
      </div>
    )
  }

  if (!timetable || !entityTiming) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No timetable data available</div>
      </div>
    )
  }

  const timelineWidth = getTimelineWidth()
  const timeMarkers = generateTimeMarkers()

  return (
    <div className="flex h-screen">
      {/* Timeline View - Left Side */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Timetable Editor
            </h3>
            <p className="text-sm text-gray-500">
              Click on timeline to add slots • Click on existing slots to edit
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Time range: {formatTime(entityTiming.startHour, entityTiming.startMinute)} - {formatTime(entityTiming.endHour, entityTiming.endMinute)}
            </p>
          </div>

          {!readOnly && (
            <div className="flex space-x-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Timetable'}
              </button>
            </div>
          )}
        </div>

        {/* Timeline Container - Scrollable */}
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          {/* Time Markers Header */}
          <div className="bg-gray-50 border-b border-gray-300 relative overflow-x-auto" style={{ height: '40px' }}>
            <div className="flex items-center h-full" style={{ minWidth: timelineWidth + 96 }}>
              <div className="w-24 px-4 text-sm font-medium text-gray-900 border-r border-gray-300 bg-gray-50 sticky left-0 z-10">
                Time
              </div>
              <div className="relative" style={{ width: timelineWidth }}>
                {timeMarkers.map((marker, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full flex flex-col justify-center border-l border-gray-300"
                    style={{ left: marker.position }}
                  >
                    <div className="text-xs text-gray-600 ml-1">{marker.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Days Timeline - Scrollable */}
          <div className="divide-y divide-gray-200 overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {DAYS_OF_WEEK.map(day => {
              const daySlots = timetable.schedule[day] || []

              return (
                <div key={day} className="flex items-center" style={{ height: '80px', minWidth: timelineWidth + 96 }}>
                  {/* Day Label */}
                  <div className="w-24 px-4 text-sm font-medium text-gray-900 border-r border-gray-300 bg-gray-50 sticky left-0 z-10">
                    {day}
                  </div>

                  {/* Timeline Track */}
                  <div
                    className="relative h-full bg-gray-50 cursor-pointer"
                    style={{ width: timelineWidth }}
                    onClick={(e) => handleTimelineClick(day, e)}
                  >
                    {/* Background grid lines */}
                    {timeMarkers.map((marker, index) => (
                      <div
                        key={index}
                        className="absolute top-0 h-full border-l border-gray-200"
                        style={{ left: marker.position }}
                      />
                    ))}

                    {/* Slots */}
                    {daySlots.map((slot, slotIndex) => {
                      if (typeof slot !== 'object' || !('status' in slot)) return null

                      const tSlot = slot as TimetableSlot
                      const { left, width } = getSlotPosition(tSlot)
                      const isSelected = selectedSlot?.day === day && selectedSlot?.slotIndex === slotIndex

                      return (
                        <div
                          key={slotIndex}
                          className={`absolute top-2 bottom-2 rounded border-2 cursor-pointer transition-all group ${isSelected ? 'ring-2 ring-blue-500' : ''
                            } ${getSlotColor(tSlot)}`}
                          style={{ left, width }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSlotClick(day, slotIndex)
                          }}
                        >
                          {/* Slot Content */}
                          <div className="h-full flex items-center justify-center px-2 text-xs font-medium text-gray-800 overflow-hidden">
                            <div className="truncate">
                              {tSlot.courseCode || 'New Slot'}
                            </div>
                          </div>

                          {/* Delete button */}
                          {!readOnly && (
                            <button
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSlotDelete(day, slotIndex)
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Slot Editor Panel - Right Side */}
      <div className="w-96 bg-gray-50 border-l border-gray-300 p-6 overflow-auto">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          {selectedSlot ? 'Edit Slot' : 'Add New Slot'}
        </h4>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={editingSlot.status}
              onChange={(e) => setEditingSlot({ ...editingSlot, status: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Free</option>
              <option value={1}>Occupied</option>
            </select>
          </div>

          {/* Day Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAYS_OF_WEEK.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={editingSlot.startHour}
                onChange={(e) => setEditingSlot({ ...editingSlot, startHour: parseInt(e.target.value) || 0 })}
                min="0"
                max="23"
                placeholder="Hour"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={editingSlot.startMinute}
                onChange={(e) => setEditingSlot({ ...editingSlot, startMinute: parseInt(e.target.value) || 0 })}
                min="0"
                max="59"
                step="5"
                placeholder="Min"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={editingSlot.duration}
              onChange={(e) => setEditingSlot({ ...editingSlot, duration: parseInt(e.target.value) || 50 })}
              min="5"
              max="300"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {editingSlot.status > 0 && (
            <>
              {/* Course Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Code
                </label>
                <select
                  value={editingSlot.courseCode || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, courseCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.code}>{course.code} - {course.name}</option>
                  ))}
                </select>
              </div>

              {/* Faculty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty
                </label>
                <select
                  multiple
                  value={(editingSlot.facultyIds || []).map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setEditingSlot({ ...editingSlot, facultyIds: values })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {faculty.map(f => (
                    <option key={f.id} value={f.id}>{f.name} {f.shortForm ? `(${f.shortForm})` : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Faculty Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faculty Groups
                </label>
                <select
                  multiple
                  value={(editingSlot.facultyGroupIds || []).map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setEditingSlot({ ...editingSlot, facultyGroupIds: values })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {facultyGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.groupName}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Halls */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Halls
                </label>
                <select
                  multiple
                  value={(editingSlot.hallIds || []).map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setEditingSlot({ ...editingSlot, hallIds: values })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {halls.map(hall => (
                    <option key={hall.id} value={hall.id}>{hall.name} - {hall.Building} {hall.Floor} {hall.shortForm ? `(${hall.shortForm})` : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Hall Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hall Groups
                </label>
                <select
                  multiple
                  value={(editingSlot.hallGroupIds || []).map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setEditingSlot({ ...editingSlot, hallGroupIds: values })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {hallGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.groupName}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Students */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Students
                </label>
                <select
                  multiple
                  value={(editingSlot.studentIds || []).map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setEditingSlot({ ...editingSlot, studentIds: values })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {students.map(student => (
                    <option key={student.id} value={student.id}>Student {student.digitalId}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Student Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Groups
                </label>
                <select
                  multiple
                  value={(editingSlot.studentGroupIds || []).map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setEditingSlot({ ...editingSlot, studentGroupIds: values })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {studentGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.groupName}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </>
          )}

          {/* Conflicts Display */}
          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <h5 className="text-sm font-medium text-red-800 mb-2">Conflicts Detected:</h5>
              <ul className="text-xs text-red-700 space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index}>• {conflict}</li>
                ))}
              </ul>
            </div>
          )}

          {checkingConflicts && (
            <div className="text-sm text-gray-500 text-center">
              Checking for conflicts...
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            {selectedSlot ? (
              <button
                onClick={handleUpdateSlot}
                disabled={checkingConflicts}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingConflicts ? 'Checking...' : 'Update Slot'}
              </button>
            ) : (
              <button
                onClick={handleAddSlot}
                disabled={checkingConflicts}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {checkingConflicts ? 'Checking...' : 'Add Slot'}
              </button>
            )}

            {selectedSlot && (
              <button
                onClick={() => {
                  setSelectedSlot(null)
                  setConflicts([])
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}