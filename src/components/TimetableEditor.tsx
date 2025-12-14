'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { EntityType, EntityTimetable, TimetableSlot, Course, EntityTiming } from '@/types'
import { DAYS_OF_WEEK, validateTimetable } from '@/lib/timetable'
import { useSession } from '@/contexts/SessionContext'

interface TimetableEditorProps {
  entityId: string
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Drag and drop state
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: string; slotIndex: number }>>([])
  const [draggingSlots, setDraggingSlots] = useState<Array<{ day: string; slotIndex: number; slot: TimetableSlot }> | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragPreview, setDragPreview] = useState<{ day: string; startTime: number } | null>(null)
  const [moveConflicts, setMoveConflicts] = useState<string[]>([])
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false)
  const [pendingMove, setPendingMove] = useState<{
    slots: Array<{ day: string; slotIndex: number; slot: TimetableSlot }>
    targetDay: string
    targetStartTime: number
  } | null>(null)

  // Swap state
  const [swapSlots, setSwapSlots] = useState<Array<{ day: string; slotIndex: number; slot: TimetableSlot }>>([])
  const [showSwapConfirmation, setShowSwapConfirmation] = useState(false)
  const [swapConflicts, setSwapConflicts] = useState<string[]>([])
  const [pendingSwap, setPendingSwap] = useState<{
    slot1: { day: string; slotIndex: number; slot: TimetableSlot }
    slot2: { day: string; slotIndex: number; slot: TimetableSlot }
  } | null>(null)

  // Slot editor form state
  const [editingSlot, setEditingSlot] = useState<TimetableSlot>({
    type: 'course',
    startHour: 8,
    startMinute: 10,
    duration: 50,
    courseId: undefined,
    courseCode: '',
    blockerReason: ''
  })
  const [selectedDay, setSelectedDay] = useState<string>('Monday')

  // Reference data
  const [conflicts, setConflicts] = useState<string[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  // Helper function to check if a course is fully scheduled
  const isCourseFullyScheduled = (courseId: string): boolean => {
    const course = courses.find(c => c.id === courseId)
    return Boolean(course && (course.scheduledCount || 0) >= (course.totalSessions || 0))
  }

  // Initialize timetable
  useEffect(() => {
    if (initialTimetable) {
      console.log('Setting timetable from initialTimetable:', JSON.stringify(initialTimetable, null, 2))
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

      console.log('Setting empty timetable:', JSON.stringify(emptyTimetable, null, 2))
      setTimetable(emptyTimetable)
    } else {
      console.log('No timetable set - missing initialTimetable, currentSession, or entityTiming')
    }
  }, [initialTimetable, entityId, entityType, currentSession, entityTiming])

  // Load courses for the slot editor
  const loadCourses = useCallback(async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      const coursesRes = await fetch(`/api/courses?sessionId=${currentSession.id}&limit=1000`)
      const coursesData = await coursesRes.json()
      if (coursesData.success) {
        const courses = coursesData.data.courses || []
        console.log('Loaded courses with scheduled counts:', courses.map((c: any) => ({
          id: c.id,
          code: c.code,
          scheduledCount: c.scheduledCount,
          totalSessions: c.totalSessions
        })))
        setCourses(courses)
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }, [currentSession])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // Load available courses based on entity
  const loadAvailableCourses = useCallback(async () => {
    if (!currentSession) return

    setLoadingCourses(true)
    try {
      const response = await fetch(`/api/courses/available?entityType=${entityType}&entityId=${entityId}&sessionId=${currentSession.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAvailableCourses(data.data.courses || [])
        }
      }
    } catch (error) {
      console.error('Error loading available courses:', error)
    } finally {
      setLoadingCourses(false)
    }
  }, [currentSession, entityType, entityId])

  useEffect(() => {
    loadAvailableCourses()
  }, [loadAvailableCourses])

  // Check for conflicts when moving slots (excludes all moving slots from conflict detection)
  const checkConflictsExcludingSlots = useCallback(async (
    slot: TimetableSlot, 
    day: string, 
    excludeSlots: Array<{ day: string; slotIndex: number; slot: TimetableSlot }>,
    movedSlots: TimetableSlot[]
  ): Promise<string[]> => {
    if (!currentSession) return []

    const conflicts: string[] = []
    const slotStart = slot.startHour * 60 + slot.startMinute
    const slotEnd = slotStart + slot.duration

    // Helper function to check if two time slots overlap
    const slotsOverlap = (slot1Start: number, slot1End: number, slot2Start: number, slot2End: number) => {
      return slot1Start < slot2End && slot1End > slot2Start
    }

    // Helper function to format time for display
    const formatTime = (hour: number, minute: number) => {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }

    // Helper to check if a slot is one of the moving slots
    const isMovingSlot = (existingSlot: TimetableSlot, checkDay: string, checkIndex: number) => {
      // Check if it's in the original positions
      const isOriginal = excludeSlots.some(es => 
        es.day === checkDay && 
        es.slotIndex === checkIndex
      )
      
      // Check if it matches any of the moved slots (to avoid self-conflict in new position)
      const isMovedSlot = movedSlots.some(ms => {
        const msStart = ms.startHour * 60 + ms.startMinute
        const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
        return msStart === existingStart && 
               ms.duration === existingSlot.duration &&
               ms.type === existingSlot.type &&
               (ms.courseId === existingSlot.courseId || ms.courseCode === existingSlot.courseCode)
      })
      
      return isOriginal || isMovedSlot
    }

    // Get all entity IDs that would be affected by this slot
    const allEntityIds = [
      ...(slot.facultyIds || []).map(id => ({ type: 'faculty', id })),
      ...(slot.facultyGroupIds || []).map(id => ({ type: 'facultyGroup', id })),
      ...(slot.hallIds || []).map(id => ({ type: 'hall', id })),
      ...(slot.hallGroupIds || []).map(id => ({ type: 'hallGroup', id })),
      ...(slot.studentIds || []).map(id => ({ type: 'student', id })),
      ...(slot.studentGroupIds || []).map(id => ({ type: 'studentGroup', id }))
    ]

    // Check conflicts for each related entity
    for (const entity of allEntityIds) {
      try {
        const response = await fetch(`/api/timetables?entityType=${entity.type}&entityId=${entity.id}&sessionId=${currentSession.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.timetable) {
            const entityTimetable = data.data.timetable
            const daySlots = entityTimetable[day] || []

            // Check each existing slot for conflicts
            for (let i = 0; i < daySlots.length; i++) {
              const existingSlot = daySlots[i]

              // Skip if this is one of the slots we're moving
              if (entityType === entity.type && entityId === entity.id && isMovingSlot(existingSlot, day, i)) {
                continue
              }

              if (typeof existingSlot === 'object' && 'startHour' in existingSlot) {
                const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                const existingEnd = existingStart + existingSlot.duration

                // Check for time overlap
                if (slotsOverlap(slotStart, slotEnd, existingStart, existingEnd)) {
                  // Skip if this is the same course (not a real conflict)
                  if (slot.type === 'course' && existingSlot.type === 'course' && 
                      slot.courseId && existingSlot.courseId && 
                      slot.courseId === existingSlot.courseId) {
                    continue
                  }

                  const entityName = await getEntityName(entity.type, entity.id)
                  const conflictTime = `${formatTime(existingSlot.startHour, existingSlot.startMinute)} - ${formatTime(
                    Math.floor(existingEnd / 60),
                    existingEnd % 60
                  )}`

                  let conflictDescription = ''
                  if (existingSlot.type === 'course') {
                    conflictDescription = existingSlot.courseCode || 'Course'
                  } else if (existingSlot.type === 'blocker') {
                    conflictDescription = existingSlot.blockerReason || 'Blocked time'
                  }

                  conflicts.push(`${entityName} is already scheduled: ${conflictDescription} (${conflictTime})`)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error checking conflicts for ${entity.type} ${entity.id}:`, error)
      }
    }

    return conflicts
  }, [currentSession, entityType, entityId])

  // Check for conflicts when adding/updating slots
  const checkConflicts = useCallback(async (slot: TimetableSlot, day: string, excludeSlotIndex?: number): Promise<string[]> => {
    if (!currentSession) return []

    const conflicts: string[] = []
    const slotStart = slot.startHour * 60 + slot.startMinute
    const slotEnd = slotStart + slot.duration

    // Helper function to check if two time slots overlap
    const slotsOverlap = (slot1Start: number, slot1End: number, slot2Start: number, slot2End: number) => {
      return slot1Start < slot2End && slot1End > slot2Start
    }

    // Helper function to format time for display
    const formatTime = (hour: number, minute: number) => {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }

    // Get all entity IDs that would be affected by this slot
    const allEntityIds = [
      ...(slot.facultyIds || []).map(id => ({ type: 'faculty', id })),
      ...(slot.facultyGroupIds || []).map(id => ({ type: 'facultyGroup', id })),
      ...(slot.hallIds || []).map(id => ({ type: 'hall', id })),
      ...(slot.hallGroupIds || []).map(id => ({ type: 'hallGroup', id })),
      ...(slot.studentIds || []).map(id => ({ type: 'student', id })),
      ...(slot.studentGroupIds || []).map(id => ({ type: 'studentGroup', id }))
    ]

    // Check conflicts for each related entity
    for (const entity of allEntityIds) {
      try {
        const response = await fetch(`/api/timetables?entityType=${entity.type}&entityId=${entity.id}&sessionId=${currentSession.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.timetable) {
            const entityTimetable = data.data.timetable
            const daySlots = entityTimetable[day] || []

            // Check each existing slot for conflicts
            for (let i = 0; i < daySlots.length; i++) {
              const existingSlot = daySlots[i]

              // Skip if this is the slot we're currently editing
              if (entityType === entity.type && entityId === entity.id && excludeSlotIndex === i) {
                continue
              }

              if (typeof existingSlot === 'object' && 'startHour' in existingSlot) {
                const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                const existingEnd = existingStart + existingSlot.duration

                // Check for time overlap
                if (slotsOverlap(slotStart, slotEnd, existingStart, existingEnd)) {
                  // Skip if this is the same course (not a real conflict)
                  if (slot.type === 'course' && existingSlot.type === 'course' && 
                      slot.courseId && existingSlot.courseId && 
                      slot.courseId === existingSlot.courseId) {
                    continue
                  }

                  const entityName = await getEntityName(entity.type, entity.id)
                  const conflictTime = `${formatTime(existingSlot.startHour, existingSlot.startMinute)} - ${formatTime(
                    Math.floor(existingEnd / 60),
                    existingEnd % 60
                  )}`

                  let conflictDescription = ''
                  if (existingSlot.type === 'course') {
                    conflictDescription = existingSlot.courseCode || 'Course'
                  } else if (existingSlot.type === 'blocker') {
                    conflictDescription = existingSlot.blockerReason || 'Blocked time'
                  }

                  conflicts.push(`${entityName} is already scheduled: ${conflictDescription} (${conflictTime})`)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error checking conflicts for ${entity.type} ${entity.id}:`, error)
      }
    }

    return conflicts
  }, [currentSession, entityType, entityId])

  // Helper function to get entity name for conflict messages
  const getEntityName = async (entityType: string, entityId: string): Promise<string> => {
    try {
      let endpoint = ''
      switch (entityType) {
        case 'faculty':
          endpoint = `/api/faculty/${entityId}`
          break
        case 'hall':
          endpoint = `/api/halls/${entityId}`
          break
        case 'student':
          endpoint = `/api/students/${entityId}`
          break
        case 'facultyGroup':
          endpoint = `/api/faculty-groups/${entityId}`
          break
        case 'hallGroup':
          endpoint = `/api/hall-groups/${entityId}`
          break
        case 'studentGroup':
          endpoint = `/api/student-groups/${entityId}`
          break
        default:
          return `${entityType} ${entityId}`
      }

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const entity = data.data
          if (entityType.includes('Group')) {
            return `${entityType === 'facultyGroup' ? 'Faculty' : entityType === 'hallGroup' ? 'Hall' : 'Student'} Group: ${entity.groupName}`
          } else if (entityType === 'faculty') {
            return `Faculty: ${entity.shortForm || entity.name}`
          } else if (entityType === 'hall') {
            return `Hall: ${entity.shortForm || entity.name}`
          } else if (entityType === 'student') {
            return `Student: ${entity.digitalId}`
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching entity name for ${entityType} ${entityId}:`, error)
    }

    return `${entityType} ${entityId}`
  }

  // Update course scheduled count
  const updateCourseScheduledCount = async (courseId: string, increment: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/courses/${courseId}/scheduled-count`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('Failed to update course scheduled count:', data.error?.message || 'Unknown error')
        return false
      }

      console.log(`Successfully updated course ${courseId} scheduled count by ${increment}. New count: ${data.data.scheduledCount}`)
      console.log('API response data:', data.data)

      // Update the local courses state with the new scheduled count
      setCourses(prevCourses =>
        prevCourses.map(course =>
          course.id === courseId
            ? { ...course, scheduledCount: data.data.scheduledCount }
            : course
        )
      )

      return true
    } catch (error) {
      console.error('Error updating course scheduled count:', error)
      return false
    }
  }

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

  const getTimeFromPosition = (x: number, snapToFive: boolean = false) => {
    if (!entityTiming) return { hour: 8, minute: 0 }

    const timelineWidth = getTimelineWidth()
    const totalMinutes = (entityTiming.endHour * 60 + entityTiming.endMinute) - (entityTiming.startHour * 60 + entityTiming.startMinute)
    const timelineStart = entityTiming.startHour * 60 + entityTiming.startMinute

    const minutesFromStart = (x / timelineWidth) * totalMinutes
    const totalMinutesFromMidnight = timelineStart + minutesFromStart

    let hour = Math.floor(totalMinutesFromMidnight / 60)
    let minute = Math.floor(totalMinutesFromMidnight % 60)

    // Snap to nearest 5 minutes (rounding down)
    if (snapToFive) {
      minute = Math.floor(minute / 5) * 5
    }

    return { hour: Math.max(0, Math.min(23, hour)), minute: Math.max(0, Math.min(59, minute)) }
  }

  const handleSlotClick = (day: string, slotIndex: number, event?: React.MouseEvent) => {
    if (readOnly || !timetable) return

    const daySlots = timetable.schedule[day] || []
    const slot = daySlots[slotIndex]

    if (slot && typeof slot === 'object' && 'type' in slot) {
      const tSlot = slot as TimetableSlot

      // Swap mode with Alt key
      if (event && event.altKey) {
        const slotData = { day, slotIndex, slot: tSlot }
        const isAlreadyInSwap = swapSlots.some(s => s.day === day && s.slotIndex === slotIndex)
        
        if (isAlreadyInSwap) {
          // Remove from swap selection
          setSwapSlots(swapSlots.filter(s => !(s.day === day && s.slotIndex === slotIndex)))
        } else if (swapSlots.length < 2) {
          // Add to swap selection (max 2)
          const newSwapSlots = [...swapSlots, slotData]
          setSwapSlots(newSwapSlots)
          
          // If we now have 2 slots, trigger swap
          if (newSwapSlots.length === 2) {
            handleInitiateSwap(newSwapSlots[0], newSwapSlots[1])
          }
        }
        return
      }

      // Multi-select with Ctrl/Cmd key
      if (event && (event.ctrlKey || event.metaKey)) {
        const slotId = { day, slotIndex }
        const isAlreadySelected = selectedSlots.some(s => s.day === day && s.slotIndex === slotIndex)
        
        if (isAlreadySelected) {
          setSelectedSlots(selectedSlots.filter(s => !(s.day === day && s.slotIndex === slotIndex)))
        } else {
          // Only allow multi-select if all slots are on the same day
          if (selectedSlots.length === 0 || selectedSlots.every(s => s.day === day)) {
            setSelectedSlots([...selectedSlots, slotId])
          } else {
            // Different day, start new selection
            setSelectedSlots([slotId])
          }
        }
        return
      }

      // Regular click - open editor
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
      setSelectedSlots([]) // Clear multi-selection when opening editor
      setSwapSlots([]) // Clear swap selection when opening editor
    }
  }

  const handleTimelineClick = (day: string, event: React.MouseEvent) => {
    if (readOnly || !timetable || !entityTiming) return

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event.clientX - rect.left
    const { hour, minute } = getTimeFromPosition(x)

    // Create new slot at clicked position
    const newSlot: TimetableSlot = {
      type: 'course',
      startHour: hour,
      startMinute: minute,
      duration: 50,
      courseId: undefined,
      courseCode: '',
      blockerReason: '',
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

    // Check if course is fully scheduled
    if (editingSlot.type === 'course' && editingSlot.courseId) {
      if (isCourseFullyScheduled(editingSlot.courseId)) {
        const course = courses.find(c => c.id === editingSlot.courseId)
        alert(`Cannot schedule ${course?.code} - all ${course?.totalSessions} sessions are already scheduled.`)
        return
      }
    }

    // Populate resource IDs based on context
    let slotToAdd = { ...editingSlot }
    console.log(JSON.stringify(editingSlot, null, 2));

    // For course slots, automatically populate resource IDs from the course
    if (editingSlot.type === 'course' && editingSlot.courseId) {
      const course = courses.find(c => c.id === editingSlot.courseId)
      if (course) {
        slotToAdd = {
          ...editingSlot,
          facultyIds: course.compulsoryFaculties?.map(f => f.id) || [],
          hallIds: course.compulsoryHalls?.map(h => h.id) || [],
          facultyGroupIds: course.compulsoryFacultyGroups?.map(g => g.facultyGroup.id) || [],
          hallGroupIds: course.compulsoryHallGroups?.map(g => g.hallGroup.id) || [],
          studentIds: course.studentEnrollments?.map(e => e.student.id) || [],
          studentGroupIds: course.studentGroupEnrollments?.map(e => e.studentGroup.id) || []
        }
      }
    }

    // For ALL slot types (including blockers), if we're editing a group timetable,
    // populate the group ID so the slot propagates to all group members
    if (entityType === 'studentGroup') {
      slotToAdd = {
        ...slotToAdd,
        studentGroupIds: [...(slotToAdd.studentGroupIds || []), entityId]
      }
    } else if (entityType === 'facultyGroup') {
      slotToAdd = {
        ...slotToAdd,
        facultyGroupIds: [...(slotToAdd.facultyGroupIds || []), entityId]
      }
    } else if (entityType === 'hallGroup') {
      slotToAdd = {
        ...slotToAdd,
        hallGroupIds: [...(slotToAdd.hallGroupIds || []), entityId]
      }
    } else if (entityType === 'student') {
      slotToAdd = {
        ...slotToAdd,
        studentIds: [...(slotToAdd.studentIds || []), entityId]
      }
    } else if (entityType === 'faculty') {
      slotToAdd = {
        ...slotToAdd,
        facultyIds: [...(slotToAdd.facultyIds || []), entityId]
      }
    } else if (entityType === 'hall') {
      slotToAdd = {
        ...slotToAdd,
        hallIds: [...(slotToAdd.hallIds || []), entityId]
      }
    }

    // Check for conflicts before adding the slot
    setCheckingConflicts(true)
    const conflictList = await checkConflicts(slotToAdd, selectedDay)
    setCheckingConflicts(false)

    if (conflictList.length > 0) {
      setConflicts(conflictList)
      return // Don't add the slot if there are conflicts
    }

    // Clear any previous conflicts
    setConflicts([])

    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }

    if (!newTimetable.schedule[selectedDay]) {
      newTimetable.schedule[selectedDay] = []
    }

    const daySlots = [...newTimetable.schedule[selectedDay]]
    daySlots.push(slotToAdd)

    // Sort by start time
    daySlots.sort((a, b) => {
      const aTime = a.startHour * 60 + a.startMinute
      const bTime = b.startHour * 60 + b.startMinute
      return aTime - bTime
    })

    newTimetable.schedule[selectedDay] = daySlots
    setTimetable(newTimetable)

    // Update course scheduled count if it's a course slot
    if (slotToAdd.type === 'course' && slotToAdd.courseId) {
      console.log(`Attempting to increment scheduled count for course ${slotToAdd.courseId}`)
      const success = await updateCourseScheduledCount(slotToAdd.courseId, 1)
      if (!success) {
        console.warn('Failed to update course scheduled count, but slot was added to timetable')
      } else {
        console.log('Successfully incremented scheduled count')
        // Refresh course lists to show updated scheduled counts
        await loadCourses()
        await loadAvailableCourses()
      }
    }

    // Update all related entity timetables
    console.log(JSON.stringify(slotToAdd, null, 2));
    console.log(JSON.stringify(newTimetable, null, 2));
    await updateRelatedTimetables(slotToAdd, selectedDay, 'add')

    // Reset form
    setEditingSlot({
      type: 'course',
      startHour: 8,
      startMinute: 10,
      duration: 50,
      courseId: undefined,
      courseCode: '',
      blockerReason: ''
    })
    setConflicts([])
  }

  const handleUpdateSlot = async () => {
    if (!timetable || !selectedSlot || !currentSession) return

    // Check if course is fully scheduled (only if changing to a different course)
    if (editingSlot.type === 'course' && editingSlot.courseId) {
      const oldSlot = timetable.schedule[selectedSlot.day]?.[selectedSlot.slotIndex] as TimetableSlot
      const isChangingCourse = oldSlot?.courseId !== editingSlot.courseId

      if (isChangingCourse && isCourseFullyScheduled(editingSlot.courseId)) {
        const course = courses.find(c => c.id === editingSlot.courseId)
        alert(`Cannot schedule ${course?.code} - all ${course?.totalSessions} sessions are already scheduled.`)
        return
      }
    }

    // Populate resource IDs based on context
    let slotToUpdate = { ...editingSlot }

    // For course slots, automatically populate resource IDs from the course
    if (editingSlot.type === 'course' && editingSlot.courseId) {
      const course = courses.find(c => c.id === editingSlot.courseId)
      if (course) {
        slotToUpdate = {
          ...editingSlot,
          facultyIds: course.compulsoryFaculties?.map(f => f.id) || [],
          hallIds: course.compulsoryHalls?.map(h => h.id) || [],
          facultyGroupIds: course.compulsoryFacultyGroups?.map(g => g.facultyGroup.id) || [],
          hallGroupIds: course.compulsoryHallGroups?.map(g => g.hallGroup.id) || [],
          studentIds: course.studentEnrollments?.map(e => e.student.id) || [],
          studentGroupIds: course.studentGroupEnrollments?.map(e => e.studentGroup.id) || []
        }
      }
    }

    // For ALL slot types (including blockers), if we're editing a group timetable,
    // populate the group ID so the slot propagates to all group members
    if (entityType === 'studentGroup') {
      slotToUpdate = {
        ...slotToUpdate,
        studentGroupIds: [...(slotToUpdate.studentGroupIds || []), entityId]
      }
    } else if (entityType === 'facultyGroup') {
      slotToUpdate = {
        ...slotToUpdate,
        facultyGroupIds: [...(slotToUpdate.facultyGroupIds || []), entityId]
      }
    } else if (entityType === 'hallGroup') {
      slotToUpdate = {
        ...slotToUpdate,
        hallGroupIds: [...(slotToUpdate.hallGroupIds || []), entityId]
      }
    } else if (entityType === 'student') {
      slotToUpdate = {
        ...slotToUpdate,
        studentIds: [...(slotToUpdate.studentIds || []), entityId]
      }
    } else if (entityType === 'faculty') {
      slotToUpdate = {
        ...slotToUpdate,
        facultyIds: [...(slotToUpdate.facultyIds || []), entityId]
      }
    } else if (entityType === 'hall') {
      slotToUpdate = {
        ...slotToUpdate,
        hallIds: [...(slotToUpdate.hallIds || []), entityId]
      }
    }

    // Check for conflicts before updating the slot (exclude the current slot being edited)
    setCheckingConflicts(true)
    const conflictList = await checkConflicts(slotToUpdate, selectedSlot.day, selectedSlot.slotIndex)
    setCheckingConflicts(false)

    if (conflictList.length > 0) {
      setConflicts(conflictList)
      return // Don't update the slot if there are conflicts
    }

    // Clear any previous conflicts
    setConflicts([])

    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }
    const daySlots = [...(newTimetable.schedule[selectedSlot.day] || [])]

    if (selectedSlot.slotIndex >= 0 && selectedSlot.slotIndex < daySlots.length) {
      const oldSlot = daySlots[selectedSlot.slotIndex] as TimetableSlot
      daySlots[selectedSlot.slotIndex] = slotToUpdate

      // Sort by start time
      daySlots.sort((a, b) => {
        const aTime = a.startHour * 60 + a.startMinute
        const bTime = b.startHour * 60 + b.startMinute
        return aTime - bTime
      })

      newTimetable.schedule[selectedSlot.day] = daySlots
      setTimetable(newTimetable)

      // Update course scheduled counts
      if (oldSlot.type === 'course' && oldSlot.courseId) {
        const decrementSuccess = await updateCourseScheduledCount(oldSlot.courseId, -1)
        if (!decrementSuccess) {
          console.warn('Failed to decrement scheduled count for old course')
        }
      }
      if (slotToUpdate.type === 'course' && slotToUpdate.courseId) {
        const incrementSuccess = await updateCourseScheduledCount(slotToUpdate.courseId, 1)
        if (!incrementSuccess) {
          console.warn('Failed to increment scheduled count for new course')
        }
      }

      // Update all related entity timetables
      await updateRelatedTimetables(oldSlot, selectedSlot.day, 'remove')
      await updateRelatedTimetables(slotToUpdate, selectedSlot.day, 'add')
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
    console.log(JSON.stringify(slot, null, 2));

    // Helper function to update a single entity's timetable
    const updateEntityTimetable = async (entityType: string, entityId: string) => {
      try {
        // Get current timetable
        const response = await fetch(`/api/timetables?entityType=${entityType}&entityId=${entityId}&sessionId=${currentSession.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const entityTimetable = data.data.timetable || {
              entityId: entityId,
              entityType: entityType,
              schedule: {},
              isComplete: false
            }

            // Initialize day if needed
            if (!entityTimetable[day]) {
              entityTimetable[day] = []
            }

            const daySlots = [...entityTimetable[day]]

            if (action === 'add') {
              // Add the slot
              daySlots.push({ ...slot })
              // Sort by start time
              daySlots.sort((a, b) => {
                const aTime = a.startHour * 60 + a.startMinute
                const bTime = b.startHour * 60 + b.startMinute
                return aTime - bTime
              })
            } else {
              // Remove matching slots
              const slotStart = slot.startHour * 60 + slot.startMinute
              for (let i = daySlots.length - 1; i >= 0; i--) {
                const existingSlot = daySlots[i]
                if (typeof existingSlot === 'object' && 'startHour' in existingSlot) {
                  const existingStart = existingSlot.startHour * 60 + existingSlot.startMinute
                  if (existingStart === slotStart &&
                    existingSlot.duration === slot.duration &&
                    existingSlot.type === slot.type &&
                    (existingSlot.courseId === slot.courseId || existingSlot.courseCode === slot.courseCode)) {
                    daySlots.splice(i, 1)
                  }
                }
              }
            }

            entityTimetable[day] = daySlots

            // Save updated timetable
            await fetch('/api/timetables', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType: entityType,
                entityId: entityId,
                sessionId: currentSession.id,
                timetable: entityTimetable
              })
            })
          }
        }
      } catch (error) {
        console.error(`Error updating ${entityType} ${entityId} timetable:`, error)
      }
    }

    // Update direct entities (individuals and groups)
    for (const entity of allEntityIds) {
      await updateEntityTimetable(entity.type, entity.id)
    }

    // Additionally, update individual members of groups
    const groupEntities = allEntityIds.filter(entity =>
      entity.type === 'facultyGroup' || entity.type === 'hallGroup' || entity.type === 'studentGroup'
    )

    for (const groupEntity of groupEntities) {
      try {
        let membersEndpoint = ''
        let memberType = ''

        switch (groupEntity.type) {
          case 'facultyGroup':
            membersEndpoint = `/api/faculty-groups/${groupEntity.id}`
            memberType = 'faculty'
            break
          case 'hallGroup':
            membersEndpoint = `/api/hall-groups/${groupEntity.id}`
            memberType = 'hall'
            break
          case 'studentGroup':
            membersEndpoint = `/api/student-groups/${groupEntity.id}`
            memberType = 'student'
            break
        }

        if (membersEndpoint) {
          const groupResponse = await fetch(membersEndpoint)
          if (groupResponse.ok) {
            const groupData = await groupResponse.json()
            if (groupData.success && groupData.data) {
              const group = groupData.data
              let members: any[] = []

              // Extract members based on group type
              switch (groupEntity.type) {
                case 'facultyGroup':
                  members = group.facultyMemberships?.map((m: any) => m.faculty) || []
                  break
                case 'hallGroup':
                  members = group.hallMemberships?.map((m: any) => m.hall) || []
                  break
                case 'studentGroup':
                  members = group.studentMemberships?.map((m: any) => m.student) || []
                  break
              }

              // Update each member's timetable
              for (const member of members) {
                await updateEntityTimetable(memberType, member.id)
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error updating members of ${groupEntity.type} ${groupEntity.id}:`, error)
      }
    }
  }

  // Drag and drop handlers
  const handleSlotMouseDown = (day: string, slotIndex: number, event: React.MouseEvent) => {
    if (readOnly || !timetable) return

    // Check if this slot is part of the multi-selection
    const isInSelection = selectedSlots.some(s => s.day === day && s.slotIndex === slotIndex)
    
    let slotsToMove: Array<{ day: string; slotIndex: number; slot: TimetableSlot }>
    
    if (isInSelection && selectedSlots.length > 0) {
      // Move all selected slots
      slotsToMove = selectedSlots.map(s => {
        const slot = timetable.schedule[s.day]?.[s.slotIndex] as TimetableSlot
        return { day: s.day, slotIndex: s.slotIndex, slot }
      }).filter(s => s.slot) // Filter out any invalid slots
    } else {
      // Move just this slot
      const slot = timetable.schedule[day]?.[slotIndex] as TimetableSlot
      if (!slot) return
      slotsToMove = [{ day, slotIndex, slot }]
    }

    setDraggingSlots(slotsToMove)
    setDragOffset({ x: event.clientX, y: event.clientY })
    
    // Prevent text selection during drag
    event.preventDefault()
  }

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!draggingSlots || !timetable || !entityTiming) return

    // Find which day row we're over
    const dayElements = document.querySelectorAll('[data-day-row]')
    let targetDay: string | null = null
    
    for (const el of Array.from(dayElements)) {
      const rect = el.getBoundingClientRect()
      if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
        targetDay = el.getAttribute('data-day-row')
        break
      }
    }

    if (!targetDay) {
      setDragPreview(null)
      return
    }

    // Find the timeline element to calculate time position
    const timelineEl = document.querySelector(`[data-day-row="${targetDay}"] [data-timeline]`)
    if (!timelineEl) return

    const rect = timelineEl.getBoundingClientRect()
    const x = event.clientX - rect.left
    const { hour, minute } = getTimeFromPosition(x, true) // Snap to 5-minute intervals
    const startTime = hour * 60 + minute

    setDragPreview({ day: targetDay, startTime })
  }, [draggingSlots, timetable, entityTiming, getTimeFromPosition])

  const handleMouseUp = useCallback(async () => {
    if (!draggingSlots || !dragPreview || !timetable || !currentSession) {
      setDraggingSlots(null)
      setDragPreview(null)
      return
    }

    // Check if all dragging slots are from the same day
    const sourceDays = new Set(draggingSlots.map(s => s.day))
    const allSameDay = sourceDays.size === 1
    const sourceDay = draggingSlots[0].day

    if (!allSameDay) {
      alert('Cannot move slots from different days together')
      setDraggingSlots(null)
      setDragPreview(null)
      return
    }

    // Calculate time offset from first slot
    const firstSlot = draggingSlots[0].slot
    const firstSlotStartTime = firstSlot.startHour * 60 + firstSlot.startMinute
    const timeOffset = dragPreview.startTime - firstSlotStartTime

    // Check if moving to same position
    if (dragPreview.day === sourceDay && timeOffset === 0) {
      setDraggingSlots(null)
      setDragPreview(null)
      return
    }

    // Create moved slots with new times
    const movedSlots = draggingSlots.map(({ slot }) => {
      const originalStartTime = slot.startHour * 60 + slot.startMinute
      const newStartTime = originalStartTime + timeOffset
      const newHour = Math.floor(newStartTime / 60)
      const newMinute = newStartTime % 60

      return {
        ...slot,
        startHour: newHour,
        startMinute: newMinute
      }
    })

    // Check for conflicts, but exclude the slots being moved from conflict detection
    const allConflicts: string[] = []
    for (let i = 0; i < movedSlots.length; i++) {
      const movedSlot = movedSlots[i]
      
      // Create a custom conflict checker that excludes all moving slots
      const conflicts = await checkConflictsExcludingSlots(movedSlot, dragPreview.day, draggingSlots, movedSlots)
      allConflicts.push(...conflicts)
    }

    if (allConflicts.length > 0) {
      // Show conflicts and revert
      setMoveConflicts(allConflicts)
      setDraggingSlots(null)
      setDragPreview(null)
      return
    }

    // No conflicts - show confirmation dialog
    setPendingMove({
      slots: draggingSlots,
      targetDay: dragPreview.day,
      targetStartTime: dragPreview.startTime
    })
    setShowMoveConfirmation(true)
    setDraggingSlots(null)
    setDragPreview(null)
  }, [draggingSlots, dragPreview, timetable, currentSession])

  // Add/remove mouse event listeners for drag
  useEffect(() => {
    if (draggingSlots) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingSlots, handleMouseMove, handleMouseUp])

  // Handle move confirmation
  const confirmMove = async () => {
    if (!pendingMove || !timetable || !currentSession) return

    const { slots, targetDay, targetStartTime } = pendingMove

    // Calculate time offset
    const firstSlot = slots[0].slot
    const firstSlotStartTime = firstSlot.startHour * 60 + firstSlot.startMinute
    const timeOffset = targetStartTime - firstSlotStartTime

    // Remove old slots (in reverse order to maintain indices)
    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }
    
    const sortedSlots = [...slots].sort((a, b) => b.slotIndex - a.slotIndex)
    for (const { day, slotIndex, slot } of sortedSlots) {
      const daySlots = [...(newTimetable.schedule[day] || [])]
      daySlots.splice(slotIndex, 1)
      newTimetable.schedule[day] = daySlots

      // Update related timetables
      await updateRelatedTimetables(slot, day, 'remove')
    }

    // Add new slots at target position
    if (!newTimetable.schedule[targetDay]) {
      newTimetable.schedule[targetDay] = []
    }

    const targetDaySlots = [...newTimetable.schedule[targetDay]]
    
    for (const { slot } of slots) {
      const originalStartTime = slot.startHour * 60 + slot.startMinute
      const newStartTime = originalStartTime + timeOffset
      const newHour = Math.floor(newStartTime / 60)
      const newMinute = newStartTime % 60

      const movedSlot = {
        ...slot,
        startHour: newHour,
        startMinute: newMinute
      }

      targetDaySlots.push(movedSlot)

      // Update related timetables
      await updateRelatedTimetables(movedSlot, targetDay, 'add')
    }

    // Sort by start time
    targetDaySlots.sort((a, b) => {
      const aTime = a.startHour * 60 + a.startMinute
      const bTime = b.startHour * 60 + b.startMinute
      return aTime - bTime
    })

    newTimetable.schedule[targetDay] = targetDaySlots
    setTimetable(newTimetable)

    // Clear state
    setShowMoveConfirmation(false)
    setPendingMove(null)
    setSelectedSlots([])
  }

  const cancelMove = () => {
    setShowMoveConfirmation(false)
    setPendingMove(null)
    setMoveConflicts([])
  }

  // Swap functionality
  const handleInitiateSwap = async (
    slot1: { day: string; slotIndex: number; slot: TimetableSlot },
    slot2: { day: string; slotIndex: number; slot: TimetableSlot }
  ) => {
    if (!currentSession || !timetable) return

    // Create swapped versions
    const swappedSlot1 = {
      ...slot1.slot,
      startHour: slot2.slot.startHour,
      startMinute: slot2.slot.startMinute
    }

    const swappedSlot2 = {
      ...slot2.slot,
      startHour: slot1.slot.startHour,
      startMinute: slot1.slot.startMinute
    }

    // Check for conflicts for both swapped slots
    const allConflicts: string[] = []

    // Check slot1 in slot2's position (exclude slot2's original position)
    const conflicts1 = await checkConflictsExcludingSlots(
      swappedSlot1,
      slot2.day,
      [slot1, slot2],
      [swappedSlot1, swappedSlot2]
    )
    allConflicts.push(...conflicts1)

    // Check slot2 in slot1's position (exclude slot1's original position)
    const conflicts2 = await checkConflictsExcludingSlots(
      swappedSlot2,
      slot1.day,
      [slot1, slot2],
      [swappedSlot1, swappedSlot2]
    )
    allConflicts.push(...conflicts2)

    if (allConflicts.length > 0) {
      // Show conflicts
      setSwapConflicts(allConflicts)
      setSwapSlots([])
      return
    }

    // No conflicts - show confirmation
    setPendingSwap({ slot1, slot2 })
    setShowSwapConfirmation(true)
  }

  const confirmSwap = async () => {
    if (!pendingSwap || !timetable || !currentSession) return

    const { slot1, slot2 } = pendingSwap

    // Create new timetable with swapped slots
    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }

    // Get the day slots
    const day1Slots = [...(newTimetable.schedule[slot1.day] || [])]
    const day2Slots = slot1.day === slot2.day ? day1Slots : [...(newTimetable.schedule[slot2.day] || [])]

    // Create swapped versions
    const swappedSlot1 = {
      ...slot1.slot,
      startHour: slot2.slot.startHour,
      startMinute: slot2.slot.startMinute
    }

    const swappedSlot2 = {
      ...slot2.slot,
      startHour: slot1.slot.startHour,
      startMinute: slot1.slot.startMinute
    }

    // Remove old slots from related timetables
    await updateRelatedTimetables(slot1.slot, slot1.day, 'remove')
    await updateRelatedTimetables(slot2.slot, slot2.day, 'remove')

    // Update the slots in the arrays
    if (slot1.day === slot2.day) {
      // Same day - need to be careful with indices
      const indices = [slot1.slotIndex, slot2.slotIndex].sort((a, b) => b - a)
      day1Slots.splice(indices[0], 1)
      day1Slots.splice(indices[1], 1)
      day1Slots.push(swappedSlot1, swappedSlot2)
      
      // Sort by start time
      day1Slots.sort((a, b) => {
        const aTime = a.startHour * 60 + a.startMinute
        const bTime = b.startHour * 60 + b.startMinute
        return aTime - bTime
      })
      
      newTimetable.schedule[slot1.day] = day1Slots
    } else {
      // Different days
      day1Slots[slot1.slotIndex] = swappedSlot1
      day2Slots[slot2.slotIndex] = swappedSlot2

      // Sort both days
      day1Slots.sort((a, b) => {
        const aTime = a.startHour * 60 + a.startMinute
        const bTime = b.startHour * 60 + b.startMinute
        return aTime - bTime
      })
      day2Slots.sort((a, b) => {
        const aTime = a.startHour * 60 + a.startMinute
        const bTime = b.startHour * 60 + b.startMinute
        return aTime - bTime
      })

      newTimetable.schedule[slot1.day] = day1Slots
      newTimetable.schedule[slot2.day] = day2Slots
    }

    // Add swapped slots to related timetables
    await updateRelatedTimetables(swappedSlot1, slot2.day, 'add')
    await updateRelatedTimetables(swappedSlot2, slot1.day, 'add')

    setTimetable(newTimetable)

    // Clear state
    setShowSwapConfirmation(false)
    setPendingSwap(null)
    setSwapSlots([])
  }

  const cancelSwap = () => {
    setShowSwapConfirmation(false)
    setPendingSwap(null)
    setSwapSlots([])
    setSwapConflicts([])
  }

  const handleSlotDelete = async (day: string, slotIndex: number) => {
    if (!timetable || !currentSession) return

    const daySlots = [...(timetable.schedule[day] || [])]

    if (slotIndex < 0 || slotIndex >= daySlots.length) return

    const slotToDelete = daySlots[slotIndex] as TimetableSlot

    // Update course scheduled count if it's a course slot
    if (slotToDelete.type === 'course' && slotToDelete.courseId) {
      const success = await updateCourseScheduledCount(slotToDelete.courseId, -1)
      if (!success) {
        console.warn('Failed to decrement scheduled count for deleted course')
      } else {
        // Refresh course lists to show updated scheduled counts
        await loadCourses()
        await loadAvailableCourses()
      }
    }

    // Remove from all related entity timetables
    await updateRelatedTimetables(slotToDelete, day, 'remove')

    // Remove from current timetable
    const newTimetable = { ...timetable }
    newTimetable.schedule = { ...timetable.schedule }
    const updatedDaySlots = [...daySlots]
    updatedDaySlots.splice(slotIndex, 1)
    newTimetable.schedule[day] = updatedDaySlots
    setTimetable(newTimetable)

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
    if (slot.type === 'course') return 'bg-blue-100 border-blue-300 hover:bg-blue-200'
    if (slot.type === 'blocker') return 'bg-red-100 border-red-300 hover:bg-red-200'
    return 'bg-gray-100 border-gray-300 hover:bg-gray-200'
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

  // Clear conflicts when editing slot changes and auto-check for course slots
  useEffect(() => {
    setConflicts([])

    // Auto-check conflicts when a course is selected or when editing any slot on a group
    if ((editingSlot.type === 'course' && editingSlot.courseId && currentSession) ||
      (currentSession && (entityType.includes('Group') || entityType === 'student' || entityType === 'faculty' || entityType === 'hall'))) {
      const autoCheckConflicts = async () => {
        let slotToCheck = { ...editingSlot }

        // For course slots, populate resource IDs from the course
        if (editingSlot.type === 'course' && editingSlot.courseId) {
          const course = courses.find(c => c.id === editingSlot.courseId)
          if (course) {
            slotToCheck = {
              ...editingSlot,
              facultyIds: course.compulsoryFaculties?.map(f => f.id) || [],
              hallIds: course.compulsoryHalls?.map(h => h.id) || [],
              facultyGroupIds: course.compulsoryFacultyGroups?.map(g => g.facultyGroup.id) || [],
              hallGroupIds: course.compulsoryHallGroups?.map(g => g.hallGroup.id) || [],
              studentIds: course.studentEnrollments?.map(e => e.student.id) || [],
              studentGroupIds: course.studentGroupEnrollments?.map(e => e.studentGroup.id) || []
            }
          }
        }

        // For ALL slot types, if we're editing a group timetable, populate the group ID
        if (entityType === 'studentGroup') {
          slotToCheck = {
            ...slotToCheck,
            studentGroupIds: [...(slotToCheck.studentGroupIds || []), entityId]
          }
        } else if (entityType === 'facultyGroup') {
          slotToCheck = {
            ...slotToCheck,
            facultyGroupIds: [...(slotToCheck.facultyGroupIds || []), entityId]
          }
        } else if (entityType === 'hallGroup') {
          slotToCheck = {
            ...slotToCheck,
            hallGroupIds: [...(slotToCheck.hallGroupIds || []), entityId]
          }
        } else if (entityType === 'student') {
          slotToCheck = {
            ...slotToCheck,
            studentIds: [...(slotToCheck.studentIds || []), entityId]
          }
        } else if (entityType === 'faculty') {
          slotToCheck = {
            ...slotToCheck,
            facultyIds: [...(slotToCheck.facultyIds || []), entityId]
          }
        } else if (entityType === 'hall') {
          slotToCheck = {
            ...slotToCheck,
            hallIds: [...(slotToCheck.hallIds || []), entityId]
          }
        }

        setCheckingConflicts(true)
        const conflictList = await checkConflicts(slotToCheck, selectedDay, selectedSlot?.slotIndex)
        setConflicts(conflictList)
        setCheckingConflicts(false)
      }

      // Delay the check slightly to avoid too many API calls
      const timeoutId = setTimeout(autoCheckConflicts, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [editingSlot, selectedDay, courses, currentSession, checkConflicts, selectedSlot?.slotIndex, entityType, entityId])

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
    <div className="flex" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Timeline View - Left Side */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Timetable Editor
            </h3>
            <p className="text-sm text-gray-500">
              Click timeline to add • Click to edit • Drag to move • Ctrl+Click to multi-select • Alt+Click to swap
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
          {/* Single Scrollable Container for Both Header and Content */}
          <div 
            className="overflow-x-auto overflow-y-auto" 
            style={{ maxHeight: '640px' }}
            onScroll={(e) => {
              // Sync scroll is automatic since both are in the same container
            }}
          >
            {/* Time Markers Header - Sticky */}
            <div className="bg-gray-50 border-b border-gray-300 relative sticky top-0 z-20" style={{ height: '40px' }}>
              <div className="flex items-center h-full" style={{ minWidth: timelineWidth + 96 }}>
                <div className="w-24 px-4 text-sm font-medium text-gray-900 border-r border-gray-300 bg-gray-50 sticky left-0 z-30">
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

            {/* Days Timeline */}
            <div className="divide-y divide-gray-200">
              {DAYS_OF_WEEK.map(day => {
                const daySlots = timetable.schedule[day] || []

                return (
                  <div key={day} className="flex items-center" style={{ height: '80px', minWidth: timelineWidth + 96 }} data-day-row={day}>
                    {/* Day Label */}
                    <div className="w-24 px-4 text-sm font-medium text-gray-900 border-r border-gray-300 bg-gray-50 sticky left-0 z-10">
                      {day}
                    </div>

                    {/* Timeline Track */}
                    <div
                      className="relative h-full bg-gray-50 cursor-pointer"
                      style={{ width: timelineWidth }}
                      onClick={(e) => handleTimelineClick(day, e)}
                      data-timeline
                    >
                      {/* Background grid lines */}
                      {timeMarkers.map((marker, index) => (
                        <div
                          key={index}
                          className="absolute top-0 h-full border-l border-gray-200"
                          style={{ left: marker.position }}
                        />
                      ))}

                      {/* Drag preview */}
                      {dragPreview && dragPreview.day === day && draggingSlots && (
                        <>
                          {draggingSlots.map((dragSlot, idx) => {
                            const firstSlotStartTime = draggingSlots[0].slot.startHour * 60 + draggingSlots[0].slot.startMinute
                            const thisSlotStartTime = dragSlot.slot.startHour * 60 + dragSlot.slot.startMinute
                            const relativeOffset = thisSlotStartTime - firstSlotStartTime
                            const previewStartTime = dragPreview.startTime + relativeOffset
                            const previewHour = Math.floor(previewStartTime / 60)
                            const previewMinute = previewStartTime % 60

                            const previewSlot = {
                              ...dragSlot.slot,
                              startHour: previewHour,
                              startMinute: previewMinute
                            }
                            const { left, width } = getSlotPosition(previewSlot)

                            return (
                              <div
                                key={idx}
                                className="absolute top-2 bottom-2 rounded border-2 border-dashed border-blue-500 bg-blue-100 opacity-50 pointer-events-none"
                                style={{ left, width }}
                              >
                                <div className="h-full flex items-center justify-center px-2 text-xs font-medium text-blue-800 overflow-hidden">
                                  <div className="truncate">
                                    {previewSlot.type === 'course'
                                      ? (previewSlot.courseCode || 'Course')
                                      : (previewSlot.blockerReason || 'Blocked')}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}

                      {/* Slots */}
                      {daySlots.map((slot, slotIndex) => {
                        if (typeof slot !== 'object' || !('type' in slot)) return null

                        const tSlot = slot as TimetableSlot
                        const { left, width } = getSlotPosition(tSlot)
                        const isSelected = selectedSlot?.day === day && selectedSlot?.slotIndex === slotIndex
                        const isMultiSelected = selectedSlots.some(s => s.day === day && s.slotIndex === slotIndex)
                        const isDragging = draggingSlots?.some(s => s.day === day && s.slotIndex === slotIndex)
                        const isInSwap = swapSlots.some(s => s.day === day && s.slotIndex === slotIndex)
                        const swapNumber = isInSwap ? swapSlots.findIndex(s => s.day === day && s.slotIndex === slotIndex) + 1 : 0

                        return (
                          <div
                            key={slotIndex}
                            className={`absolute top-2 bottom-2 rounded border-2 cursor-move transition-all group ${
                              isSelected ? 'ring-2 ring-blue-500' : ''
                            } ${
                              isMultiSelected ? 'ring-2 ring-green-500' : ''
                            } ${
                              isInSwap ? 'ring-2 ring-purple-500' : ''
                            } ${
                              isDragging ? 'opacity-30' : ''
                            } ${getSlotColor(tSlot)}`}
                            style={{ left, width }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSlotClick(day, slotIndex, e)
                            }}
                            onMouseDown={(e) => {
                              if (!readOnly && e.button === 0 && !e.altKey) {
                                handleSlotMouseDown(day, slotIndex, e)
                              }
                            }}
                          >
                            {/* Swap indicator */}
                            {isInSwap && (
                              <div className="absolute -top-1 -left-1 w-5 h-5 bg-purple-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                                {swapNumber}
                              </div>
                            )}

                            {/* Multi-select indicator */}
                            {isMultiSelected && !isInSwap && (
                              <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">
                                ✓
                              </div>
                            )}

                            {/* Slot Content */}
                            <div className="h-full flex flex-col justify-center px-2 py-1 text-xs text-gray-800 overflow-hidden">
                              {tSlot.type === 'course' ? (
                                <>
                                  <div className="font-semibold truncate text-center">
                                    {tSlot.courseCode || 'Course'}
                                  </div>
                                  {(() => {
                                    const course = courses.find(c => c.id === tSlot.courseId)
                                    if (!course) return null
                                    
                                    const faculties = course.compulsoryFaculties?.map(f => f.shortForm || f.name.split(' ').map(n => n[0]).join('')).slice(0, 2) || []
                                    const halls = course.compulsoryHalls?.map(h => h.shortForm || h.name).slice(0, 2) || []
                                    
                                    return (
                                      <>
                                        {faculties.length > 0 && (
                                          <div className="text-[10px] text-gray-600 truncate text-center">
                                            👤 {faculties.join(', ')}
                                            {course.compulsoryFaculties && course.compulsoryFaculties.length > 2 && ' +'}
                                          </div>
                                        )}
                                        {halls.length > 0 && (
                                          <div className="text-[10px] text-gray-600 truncate text-center">
                                            🏛️ {halls.join(', ')}
                                            {course.compulsoryHalls && course.compulsoryHalls.length > 2 && ' +'}
                                          </div>
                                        )}
                                      </>
                                    )
                                  })()}
                                </>
                              ) : (
                                <div className="font-medium truncate text-center">
                                  {tSlot.blockerReason || 'Blocked'}
                                </div>
                              )}
                            </div>

                            {/* Delete button */}
                            {!readOnly && (
                              <button
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await handleSlotDelete(day, slotIndex)
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
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
      </div>

      {/* Slot Editor Panel - Right Side */}
      <div className="w-96 bg-gray-50 border-l border-gray-300 p-6 overflow-auto">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          {selectedSlot ? 'Edit Slot' : 'Add New Slot'}
        </h4>

        <div className="space-y-4">
          {/* Slot Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slot Type
            </label>
            <select
              value={editingSlot.type}
              onChange={(e) => setEditingSlot({ ...editingSlot, type: e.target.value as 'course' | 'blocker' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="course">Course Lecture</option>
              <option value="blocker">Time Blocker</option>
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

          {/* Duration - Only show for blockers, courses get duration from course data */}
          {editingSlot.type === 'blocker' && (
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
          )}

          {editingSlot.type === 'course' && (
            <>
              {/* Course Duration Display */}
              {editingSlot.courseId && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Course Duration:</span>
                    <span className="text-sm font-semibold text-gray-900">{editingSlot.duration} minutes</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Duration is set by the course</p>
                </div>
              )}

              {/* Course Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Course to Schedule
                  </label>
                  <button
                    onClick={loadCourses}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    title="Refresh course list"
                  >
                    🔄 Refresh
                  </button>
                </div>
                {loadingCourses ? (
                  <div className="text-sm text-gray-500">Loading courses...</div>
                ) : (
                  <>
                    <select
                      value={editingSlot.courseId || ''}
                      onChange={(e) => {
                        const courseId = e.target.value
                        const course = availableCourses.find(c => c.id === courseId)
                        setEditingSlot({
                          ...editingSlot,
                          courseId: courseId || undefined,
                          courseCode: course?.code || '',
                          duration: course?.classDuration || 50
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">
                        {availableCourses.filter(course => !isCourseFullyScheduled(course.id)).length === 0
                          ? 'No courses available for this entity'
                          : 'Select course to schedule...'}
                      </option>
                      {availableCourses
                        .filter(course => !isCourseFullyScheduled(course.id))
                        .map(course => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name} ({course.scheduledCount}/{course.totalSessions} scheduled)
                          </option>
                        ))}
                    </select>
                    {availableCourses.filter(course => isCourseFullyScheduled(course.id)).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {availableCourses.filter(course => isCourseFullyScheduled(course.id)).length} course(s) fully scheduled and hidden
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Course Info Display */}
              {editingSlot.courseId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Course Resources</h5>
                  <div className="text-xs text-blue-800 space-y-1">
                    {(() => {
                      const course = availableCourses.find(c => c.id === editingSlot.courseId)
                      if (!course) return <p>Course not found</p>

                      const isFullyScheduled = isCourseFullyScheduled(course.id)

                      return (
                        <>
                          {isFullyScheduled && (
                            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-2">
                              <p className="text-yellow-800 font-medium">⚠️ This course is fully scheduled ({course.scheduledCount}/{course.totalSessions})</p>
                            </div>
                          )}
                          {course.compulsoryFaculties && course.compulsoryFaculties.length > 0 && (
                            <p>• Faculty: {course.compulsoryFaculties.map(f => f.shortForm || f.name).join(', ')}</p>
                          )}
                          {course.compulsoryHalls && course.compulsoryHalls.length > 0 && (
                            <p>• Halls: {course.compulsoryHalls.map(h => h.shortForm || h.name).join(', ')}</p>
                          )}
                          {course.compulsoryFacultyGroups && course.compulsoryFacultyGroups.length > 0 && (
                            <p>• Faculty Groups: {course.compulsoryFacultyGroups.map(g => g.facultyGroup.groupName).join(', ')}</p>
                          )}
                          {course.compulsoryHallGroups && course.compulsoryHallGroups.length > 0 && (
                            <p>• Hall Groups: {course.compulsoryHallGroups.map(g => g.hallGroup.groupName).join(', ')}</p>
                          )}
                          {course.studentEnrollments && course.studentEnrollments.length > 0 && (
                            <p>• Students: {course.studentEnrollments.length} enrolled</p>
                          )}
                          {course.studentGroupEnrollments && course.studentGroupEnrollments.length > 0 && (
                            <p>• Student Groups: {course.studentGroupEnrollments.map(e => e.studentGroup.groupName).join(', ')}</p>
                          )}
                          <p className="text-blue-600 font-medium mt-2">Resources will be automatically assigned when scheduling</p>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </>
          )}

          {editingSlot.type === 'blocker' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blocker Reason
              </label>
              <input
                type="text"
                value={editingSlot.blockerReason || ''}
                onChange={(e) => setEditingSlot({ ...editingSlot, blockerReason: e.target.value })}
                placeholder="Enter reason for blocking this time slot"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

          {/* Manual Conflict Check Button */}
          <div className="pt-4">
            <button
              onClick={async () => {
                if (!editingSlot) return

                // Populate resource IDs based on context
                let slotToCheck = { ...editingSlot }

                // For course slots, populate resource IDs from the course
                if (editingSlot.type === 'course' && editingSlot.courseId) {
                  const course = courses.find(c => c.id === editingSlot.courseId)
                  if (course) {
                    slotToCheck = {
                      ...editingSlot,
                      facultyIds: course.compulsoryFaculties?.map(f => f.id) || [],
                      hallIds: course.compulsoryHalls?.map(h => h.id) || [],
                      facultyGroupIds: course.compulsoryFacultyGroups?.map(g => g.facultyGroup.id) || [],
                      hallGroupIds: course.compulsoryHallGroups?.map(g => g.hallGroup.id) || [],
                      studentIds: course.studentEnrollments?.map(e => e.student.id) || [],
                      studentGroupIds: course.studentGroupEnrollments?.map(e => e.studentGroup.id) || []
                    }
                  }
                }

                // For ALL slot types, if we're editing a group timetable, populate the group ID
                if (entityType === 'studentGroup') {
                  slotToCheck = {
                    ...slotToCheck,
                    studentGroupIds: [...(slotToCheck.studentGroupIds || []), entityId]
                  }
                } else if (entityType === 'facultyGroup') {
                  slotToCheck = {
                    ...slotToCheck,
                    facultyGroupIds: [...(slotToCheck.facultyGroupIds || []), entityId]
                  }
                } else if (entityType === 'hallGroup') {
                  slotToCheck = {
                    ...slotToCheck,
                    hallGroupIds: [...(slotToCheck.hallGroupIds || []), entityId]
                  }
                } else if (entityType === 'student') {
                  slotToCheck = {
                    ...slotToCheck,
                    studentIds: [...(slotToCheck.studentIds || []), entityId]
                  }
                } else if (entityType === 'faculty') {
                  slotToCheck = {
                    ...slotToCheck,
                    facultyIds: [...(slotToCheck.facultyIds || []), entityId]
                  }
                } else if (entityType === 'hall') {
                  slotToCheck = {
                    ...slotToCheck,
                    hallIds: [...(slotToCheck.hallIds || []), entityId]
                  }
                }

                setCheckingConflicts(true)
                const conflictList = await checkConflicts(slotToCheck, selectedDay, selectedSlot?.slotIndex)
                setConflicts(conflictList)
                setCheckingConflicts(false)
              }}
              disabled={checkingConflicts}
              className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
            >
              {checkingConflicts ? 'Checking Conflicts...' : '🔍 Check for Conflicts'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            {selectedSlot ? (
              <button
                onClick={handleUpdateSlot}
                disabled={checkingConflicts || (editingSlot.type === 'course' && editingSlot.courseId ? (() => {
                  const oldSlot = timetable?.schedule[selectedSlot.day]?.[selectedSlot.slotIndex] as TimetableSlot
                  const isChangingCourse = oldSlot?.courseId !== editingSlot.courseId
                  return isChangingCourse && isCourseFullyScheduled(editingSlot.courseId)
                })() : false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingConflicts ? 'Checking...' : 'Update Slot'}
              </button>
            ) : (
              <button
                onClick={handleAddSlot}
                disabled={checkingConflicts || (editingSlot.type === 'course' && editingSlot.courseId ? isCourseFullyScheduled(editingSlot.courseId) : false)}
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

      {/* Move Confirmation Dialog */}
      {showMoveConfirmation && pendingMove && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 max-w-md w-full p-6 pointer-events-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Slot Movement
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Move {pendingMove.slots.length} slot{pendingMove.slots.length > 1 ? 's' : ''} to {pendingMove.targetDay} at{' '}
              {formatTime(
                Math.floor(pendingMove.targetStartTime / 60),
                pendingMove.targetStartTime % 60
              )}?
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-xs text-blue-800 font-medium mb-2">Slots to move:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                {pendingMove.slots.map((s, idx) => (
                  <li key={idx}>
                    • {s.slot.type === 'course' ? s.slot.courseCode : s.slot.blockerReason} 
                    {' '}({formatTime(s.slot.startHour, s.slot.startMinute)})
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmMove}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Confirm Move
              </button>
              <button
                onClick={cancelMove}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Conflicts Dialog */}
      {moveConflicts.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-red-300 max-w-md w-full p-6 pointer-events-auto">
            <h3 className="text-lg font-semibold text-red-900 mb-4">
              Cannot Move Slots - Conflicts Detected
            </h3>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 max-h-60 overflow-y-auto">
              <ul className="text-xs text-red-700 space-y-1">
                {moveConflicts.map((conflict, idx) => (
                  <li key={idx}>• {conflict}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              The slots have been returned to their original position.
            </p>
            <button
              onClick={() => setMoveConflicts([])}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Swap Confirmation Dialog */}
      {showSwapConfirmation && pendingSwap && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-purple-300 max-w-md w-full p-6 pointer-events-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Slot Swap
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Swap the times of these two slots?
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4 space-y-3">
              <div>
                <p className="text-xs text-purple-800 font-medium mb-1">Slot 1:</p>
                <p className="text-sm text-purple-900">
                  {pendingSwap.slot1.slot.type === 'course' ? pendingSwap.slot1.slot.courseCode : pendingSwap.slot1.slot.blockerReason}
                  {' '}on {pendingSwap.slot1.day} at{' '}
                  {formatTime(pendingSwap.slot1.slot.startHour, pendingSwap.slot1.slot.startMinute)}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  → Will move to {pendingSwap.slot2.day} at{' '}
                  {formatTime(pendingSwap.slot2.slot.startHour, pendingSwap.slot2.slot.startMinute)}
                </p>
              </div>
              <div className="border-t border-purple-200 pt-2">
                <p className="text-xs text-purple-800 font-medium mb-1">Slot 2:</p>
                <p className="text-sm text-purple-900">
                  {pendingSwap.slot2.slot.type === 'course' ? pendingSwap.slot2.slot.courseCode : pendingSwap.slot2.slot.blockerReason}
                  {' '}on {pendingSwap.slot2.day} at{' '}
                  {formatTime(pendingSwap.slot2.slot.startHour, pendingSwap.slot2.slot.startMinute)}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  → Will move to {pendingSwap.slot1.day} at{' '}
                  {formatTime(pendingSwap.slot1.slot.startHour, pendingSwap.slot1.slot.startMinute)}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmSwap}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                Confirm Swap
              </button>
              <button
                onClick={cancelSwap}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Conflicts Dialog */}
      {swapConflicts.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-red-300 max-w-md w-full p-6 pointer-events-auto">
            <h3 className="text-lg font-semibold text-red-900 mb-4">
              Cannot Swap Slots - Conflicts Detected
            </h3>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 max-h-60 overflow-y-auto">
              <ul className="text-xs text-red-700 space-y-1">
                {swapConflicts.map((conflict, idx) => (
                  <li key={idx}>• {conflict}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              The swap cannot be completed due to scheduling conflicts.
            </p>
            <button
              onClick={() => setSwapConflicts([])}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Swap Info Banner */}
      {swapSlots.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg z-40">
          <div className="flex items-center space-x-4">
            <span className="font-medium">
              {swapSlots.length === 1 ? 'Select another slot to swap' : 'Swapping slots...'}
            </span>
            <span className="text-sm opacity-90">
              Alt+Click to select slots
            </span>
            <button
              onClick={() => setSwapSlots([])}
              className="ml-4 px-3 py-1 bg-white text-purple-600 rounded text-sm font-medium hover:bg-purple-50"
            >
              Cancel Swap
            </button>
          </div>
        </div>
      )}

      {/* Multi-select Info Banner */}
      {selectedSlots.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-40">
          <div className="flex items-center space-x-4">
            <span className="font-medium">
              {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} selected
            </span>
            <span className="text-sm opacity-90">
              Drag to move • Ctrl+Click to select more
            </span>
            <button
              onClick={() => setSelectedSlots([])}
              className="ml-4 px-3 py-1 bg-white text-green-600 rounded text-sm font-medium hover:bg-green-50"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}