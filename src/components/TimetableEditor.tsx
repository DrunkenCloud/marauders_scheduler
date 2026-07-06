'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { EntityType, EntityTimetable, TimetableSlot, Course, SLOTS_PER_DAY } from '@/types'
import { DAYS_OF_WEEK, validateTimetable, isSlotAvailable } from '@/lib/timetable'
import { useSession } from '@/contexts/SessionContext'

interface TimetableEditorProps {
  entityId: string
  entityType: EntityType
  timetable?: EntityTimetable
  onSave: (timetable: EntityTimetable) => Promise<void>
  onCancel?: () => void
  readOnly?: boolean
}

const SLOT_LABELS = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5', 'Slot 6', 'Slot 7']

const emptySlot = (): TimetableSlot => ({
  type: 'course',
  slotNumber: 0,
  slotSpan: 1,
  courseId: undefined,
  courseCode: '',
  blockerReason: '',
  facultyIds: [],
  hallIds: [],
  facultyGroupIds: [],
  hallGroupIds: [],
  studentIds: [],
  studentGroupIds: []
})

export default function TimetableEditor({
  entityId,
  entityType,
  timetable: initialTimetable,
  onSave,
  onCancel,
  readOnly = false
}: TimetableEditorProps) {
  const { currentSession } = useSession()
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  const [timetable, setTimetable] = useState<EntityTimetable | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimetableSlot>(emptySlot())
  const [editingDay, setEditingDay] = useState<string>('Monday')
  const [editingIndex, setEditingIndex] = useState<number | null>(null) // null = new slot
  const [conflicts, setConflicts] = useState<string[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // Detail card state
  const [detailSlot, setDetailSlot] = useState<{ slot: TimetableSlot; day: string } | null>(null)
  const [detailEntities, setDetailEntities] = useState<{
    faculties: { id: string; name: string; shortForm: string | null }[]
    halls: { id: string; name: string; Building: string; Floor: string; shortForm: string | null }[]
    studentGroups: { id: string; groupName: string }[]
    facultyGroups: { id: string; groupName: string }[]
    hallGroups: { id: string; groupName: string }[]
  } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Init timetable
  useEffect(() => {
    if (initialTimetable) {
      setTimetable(initialTimetable)
    } else {
      const empty: EntityTimetable = {
        entityId, entityType, isComplete: false,
        schedule: Object.fromEntries(DAYS_OF_WEEK.map(d => [d, []]))
      }
      setTimetable(empty)
    }
  }, [initialTimetable, entityId, entityType])

  // Load all courses
  const loadCourses = useCallback(async () => {
    if (!currentSession) return
    setLoading(true)
    try {
      const res = await fetch(`${basePath}/api/courses?sessionId=${currentSession.id}&limit=1000`)
      const data = await res.json()
      if (data.success) setCourses(data.data.courses || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [currentSession, basePath])

  // Load available courses for this entity
  const loadAvailableCourses = useCallback(async () => {
    if (!currentSession) return
    try {
      const res = await fetch(`${basePath}/api/courses/available?entityType=${entityType}&entityId=${entityId}&sessionId=${currentSession.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) setAvailableCourses(data.data.courses || [])
      }
    } catch (e) { console.error(e) }
  }, [currentSession, entityType, entityId, basePath])

  useEffect(() => { loadCourses() }, [loadCourses])
  useEffect(() => { loadAvailableCourses() }, [loadAvailableCourses])

  const loadDetailEntities = useCallback(async (slot: TimetableSlot) => {
    if (slot.type !== 'course') { setDetailEntities(null); return }
    setLoadingDetail(true)
    try {
      const [facRes, hallRes, sgRes, fgRes, hgRes] = await Promise.all([
        slot.facultyIds?.length
          ? fetch(`${basePath}/api/faculty?sessionId=${currentSession?.id}&limit=1000`).then(r => r.json())
          : Promise.resolve({ data: { faculties: [] } }),
        slot.hallIds?.length
          ? fetch(`${basePath}/api/halls?sessionId=${currentSession?.id}&limit=1000`).then(r => r.json())
          : Promise.resolve({ data: { halls: [] } }),
        slot.studentGroupIds?.length
          ? fetch(`${basePath}/api/student-groups?sessionId=${currentSession?.id}&limit=1000`).then(r => r.json())
          : Promise.resolve({ data: [] }),
        slot.facultyGroupIds?.length
          ? fetch(`${basePath}/api/faculty-groups?sessionId=${currentSession?.id}&limit=1000`).then(r => r.json())
          : Promise.resolve({ data: [] }),
        slot.hallGroupIds?.length
          ? fetch(`${basePath}/api/hall-groups?sessionId=${currentSession?.id}&limit=1000`).then(r => r.json())
          : Promise.resolve({ data: [] }),
      ])

      const facIdSet = new Set(slot.facultyIds || [])
      const hallIdSet = new Set(slot.hallIds || [])
      const sgIdSet = new Set(slot.studentGroupIds || [])
      const fgIdSet = new Set(slot.facultyGroupIds || [])
      const hgIdSet = new Set(slot.hallGroupIds || [])

      setDetailEntities({
        faculties: (facRes.data?.faculties || []).filter((f: any) => facIdSet.has(f.id)),
        halls: (hallRes.data?.halls || []).filter((h: any) => hallIdSet.has(h.id)),
        studentGroups: (sgRes.data || []).filter((g: any) => sgIdSet.has(g.id)),
        facultyGroups: (fgRes.data || []).filter((g: any) => fgIdSet.has(g.id)),
        hallGroups: (hgRes.data || []).filter((g: any) => hgIdSet.has(g.id)),
      })
    } catch (e) { console.error(e) }
    finally { setLoadingDetail(false) }
  }, [currentSession, basePath])

  const isCourseFullyScheduled = (courseId: string) => {
    const c = courses.find(x => x.id === courseId)
    return Boolean(c && (c.scheduledCount || 0) >= (c.totalSessions || 0))
  }

  // Check conflicts against other entities' timetables
  const checkConflicts = useCallback(async (slot: TimetableSlot, day: string, excludeIndex?: number): Promise<string[]> => {
    if (!currentSession) return []
    const found: string[] = []

    const allEntityIds = [
      ...(slot.facultyIds || []).map(id => ({ type: 'faculty', id })),
      ...(slot.facultyGroupIds || []).map(id => ({ type: 'facultyGroup', id })),
      ...(slot.hallIds || []).map(id => ({ type: 'hall', id })),
      ...(slot.hallGroupIds || []).map(id => ({ type: 'hallGroup', id })),
      ...(slot.studentIds || []).map(id => ({ type: 'student', id })),
      ...(slot.studentGroupIds || []).map(id => ({ type: 'studentGroup', id }))
    ]

    for (const entity of allEntityIds) {
      try {
        const res = await fetch(`${basePath}/api/timetables?entityType=${entity.type}&entityId=${entity.id}&sessionId=${currentSession.id}`)
        if (!res.ok) continue
        const data = await res.json()
        if (!data.success || !data.data.timetable) continue

        const daySlots: TimetableSlot[] = data.data.timetable[day] || []
        for (let i = 0; i < daySlots.length; i++) {
          const existing = daySlots[i]
          if (entityType === entity.type && entityId === entity.id && excludeIndex === i) continue
          // Skip same course
          if (slot.type === 'course' && existing.type === 'course' && slot.courseId && existing.courseId && slot.courseId === existing.courseId) continue

          // Check slot overlap
          const newStart = slot.slotNumber
          const newEnd = slot.slotNumber + slot.slotSpan
          const exStart = existing.slotNumber
          const exEnd = existing.slotNumber + (existing.slotSpan ?? 1)
          if (newStart < exEnd && newEnd > exStart) {
            const desc = existing.type === 'course' ? (existing.courseCode || 'Course') : (existing.blockerReason || 'Blocker')
            found.push(`⚠️ ${entity.type} ${entity.id}: conflict with "${desc}" at slot ${existing.slotNumber}`)
          }
        }
      } catch (e) { console.error(e) }
    }
    return found
  }, [currentSession, entityType, entityId, basePath])

  const updateCourseScheduledCount = async (courseId: string, increment: number) => {
    try {
      const res = await fetch(`${basePath}/api/courses/${courseId}/scheduled-count`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment })
      })
      const data = await res.json()
      if (data.success) {
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, scheduledCount: data.data.scheduledCount } : c))
        loadAvailableCourses()
      }
    } catch (e) { console.error(e) }
  }

  // Open panel for a new slot at a specific cell
  const openNewSlot = (day: string, slotNumber: number) => {
    if (readOnly || !timetable) return
    setEditingDay(day)
    setEditingIndex(null)
    setEditingSlot({ ...emptySlot(), slotNumber })
    setConflicts([])
    setDetailSlot(null)
    setDetailEntities(null)
    setPanelOpen(true)
  }

  // Open panel to edit existing slot
  const openEditSlot = (day: string, index: number) => {
    if (!timetable) return
    const slot = timetable.schedule[day][index]
    setDetailSlot({ slot, day })
    loadDetailEntities(slot)
    if (readOnly) return
    setEditingDay(day)
    setEditingIndex(index)
    setEditingSlot({ ...slot })
    setConflicts([])
    setPanelOpen(true)
  }

  const handleAddOrUpdate = async () => {
    if (!timetable || !currentSession) return

    if (editingSlot.type === 'course' && editingSlot.courseId && editingIndex === null) {
      if (isCourseFullyScheduled(editingSlot.courseId)) {
        const c = courses.find(x => x.id === editingSlot.courseId)
        alert(`Cannot schedule ${c?.code} — all ${c?.totalSessions} sessions already scheduled.`)
        return
      }
    }

    // Build slot with resource IDs
    let slotToAdd = { ...editingSlot }
    if (editingSlot.type === 'course' && editingSlot.courseId) {
      const course = courses.find(c => c.id === editingSlot.courseId)
      if (course) {
        slotToAdd = {
          ...editingSlot,
          slotSpan: course.sessionsPerLecture || 1,
          facultyIds: course.compulsoryFaculties?.map(f => f.id) || [],
          hallIds: course.compulsoryHalls?.map(h => h.id) || [],
          facultyGroupIds: course.compulsoryFacultyGroups?.map(g => g.facultyGroup.id) || [],
          hallGroupIds: course.compulsoryHallGroups?.map(g => g.hallGroup.id) || [],
          studentIds: course.studentEnrollments?.map(e => e.student.id) || [],
          studentGroupIds: course.studentGroupEnrollments?.map(e => e.studentGroup.id) || []
        }
      }
    }

    // Add entity self-reference
    if (entityType === EntityType.STUDENT_GROUP) slotToAdd.studentGroupIds = [...(slotToAdd.studentGroupIds || []), entityId]
    else if (entityType === EntityType.FACULTY_GROUP) slotToAdd.facultyGroupIds = [...(slotToAdd.facultyGroupIds || []), entityId]
    else if (entityType === EntityType.HALL_GROUP) slotToAdd.hallGroupIds = [...(slotToAdd.hallGroupIds || []), entityId]
    else if (entityType === EntityType.STUDENT) slotToAdd.studentIds = [...(slotToAdd.studentIds || []), entityId]
    else if (entityType === EntityType.FACULTY) slotToAdd.facultyIds = [...(slotToAdd.facultyIds || []), entityId]
    else if (entityType === EntityType.HALL) slotToAdd.hallIds = [...(slotToAdd.hallIds || []), entityId]

    // Validate slot fits in day
    if (slotToAdd.slotNumber + slotToAdd.slotSpan > SLOTS_PER_DAY) {
      setConflicts([`Slot ${slotToAdd.slotNumber} with span ${slotToAdd.slotSpan} exceeds day boundary (max ${SLOTS_PER_DAY} slots)`])
      return
    }

    // Check local overlap
    const daySlots = timetable.schedule[editingDay] || []
    for (let i = 0; i < daySlots.length; i++) {
      if (editingIndex !== null && i === editingIndex) continue
      const ex = daySlots[i]
      const newStart = slotToAdd.slotNumber
      const newEnd = slotToAdd.slotNumber + slotToAdd.slotSpan
      const exStart = ex.slotNumber
      const exEnd = ex.slotNumber + (ex.slotSpan ?? 1)
      if (newStart < exEnd && newEnd > exStart) {
        setConflicts([`Slot overlaps with existing "${ex.type === 'course' ? ex.courseCode : ex.blockerReason}" at slot ${ex.slotNumber}`])
        return
      }
    }

    // Check remote conflicts
    setCheckingConflicts(true)
    const remoteConflicts = await checkConflicts(slotToAdd, editingDay, editingIndex ?? undefined)
    setCheckingConflicts(false)
    if (remoteConflicts.length > 0) {
      setConflicts(remoteConflicts)
      return
    }

    setConflicts([])

    // Apply to timetable
    const newSchedule = { ...timetable.schedule }
    const dayArr = [...(newSchedule[editingDay] || [])]

    if (editingIndex !== null) {
      // Update existing
      const oldSlot = dayArr[editingIndex]
      if (oldSlot.type === 'course' && oldSlot.courseId && slotToAdd.type === 'course' && slotToAdd.courseId !== oldSlot.courseId) {
        await updateCourseScheduledCount(oldSlot.courseId, -1)
      }
      dayArr[editingIndex] = slotToAdd
    } else {
      dayArr.push(slotToAdd)
      if (slotToAdd.type === 'course' && slotToAdd.courseId) {
        await updateCourseScheduledCount(slotToAdd.courseId, 1)
      }
    }

    dayArr.sort((a, b) => a.slotNumber - b.slotNumber)
    newSchedule[editingDay] = dayArr
    setTimetable({ ...timetable, schedule: newSchedule })
    setPanelOpen(false)
    loadAvailableCourses()
  }

  const handleDelete = async (day: string, index: number) => {
    if (!timetable) return
    const slot = timetable.schedule[day][index]
    const newSchedule = { ...timetable.schedule }
    const dayArr = [...newSchedule[day]]
    dayArr.splice(index, 1)
    newSchedule[day] = dayArr
    setTimetable({ ...timetable, schedule: newSchedule })

    if (slot.type === 'course' && slot.courseId) {
      await updateCourseScheduledCount(slot.courseId, -1)
    }
    if (panelOpen && editingDay === day && editingIndex === index) {
      setPanelOpen(false)
    }
    loadAvailableCourses()
  }

  const handleSave = async () => {
    if (!timetable) return
    const validation = validateTimetable(timetable)
    if (!validation.isValid) {
      alert('Timetable has errors:\n' + validation.errors.join('\n'))
      return
    }
    setSaving(true)
    try {
      await onSave(timetable)
    } catch (e: any) {
      alert('Failed to save: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!timetable) return <div className="p-6 text-gray-500">Loading...</div>

  // Build a lookup: day → slotNumber → slot+index
  const slotMap: Record<string, Record<number, { slot: TimetableSlot; index: number }[]>> = {}
  for (const day of DAYS_OF_WEEK) {
    slotMap[day] = {}
    const daySlots = timetable.schedule[day] || []
    for (let i = 0; i < daySlots.length; i++) {
      const s = daySlots[i]
      for (let j = 0; j < s.slotSpan; j++) {
        const n = s.slotNumber + j
        if (!slotMap[day][n]) slotMap[day][n] = []
        slotMap[day][n].push({ slot: s, index: i })
      }
    }
  }

  const courseOptions = availableCourses.length > 0 ? availableCourses : courses

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <span className="text-sm text-gray-500">Click any empty cell to add a slot</span>
          <div className="flex gap-2">
            {onCancel && (
              <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Timetable'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-24 p-2 text-left text-xs font-medium text-gray-500 uppercase border border-gray-200 bg-gray-50">Day</th>
                {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
                  <th key={i} className="p-2 text-center text-xs font-medium text-gray-700 uppercase border border-gray-200 bg-gray-50 min-w-[140px]">
                    {SLOT_LABELS[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map(day => (
                <tr key={day}>
                  <td className="p-2 text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 text-center whitespace-nowrap">
                    {day}
                  </td>
                  {Array.from({ length: SLOTS_PER_DAY }, (_, slotIdx) => {
                    const entries = slotMap[day][slotIdx] || []
                    const primaryEntry = entries.find(e => e.slot.slotNumber === slotIdx)
                    const coveredBySpan = entries.length > 0 && !primaryEntry

                    if (coveredBySpan) return null

                    if (primaryEntry) {
                      const { slot, index } = primaryEntry
                      const isCourse = slot.type === 'course'
                      const isSelected = panelOpen && editingDay === day && editingIndex === index
                      const course = isCourse ? courses.find(c => c.id === slot.courseId) : null
                      return (
                        <td
                          key={slotIdx}
                          colSpan={slot.slotSpan}
                          className={`p-2 border border-gray-200 cursor-pointer align-top ${
                            isCourse
                              ? isSelected ? 'bg-blue-200' : 'bg-blue-50 hover:bg-blue-100'
                              : isSelected ? 'bg-orange-200' : 'bg-orange-50 hover:bg-orange-100'
                          }`}
                          onClick={() => openEditSlot(day, index)}
                        >
                          <div className="flex flex-col gap-0.5 min-h-[60px]">
                            <span className={`text-xs font-bold truncate ${isCourse ? 'text-blue-800' : 'text-orange-800'}`}>
                              {isCourse ? (slot.courseCode || 'Course') : (slot.blockerReason || 'Blocker')}
                            </span>
                            {isCourse && course && (
                              <span className="text-xs text-blue-700 truncate">{course.name}</span>
                            )}
                            {isCourse && slot.slotSpan > 1 && (
                              <span className="text-xs text-gray-400">{slot.slotSpan} slots</span>
                            )}
                            {isCourse && (slot.facultyIds?.length || 0) > 0 && (
                              <span className="text-xs text-gray-500 truncate">
                                👤 {slot.facultyIds!.length} faculty
                              </span>
                            )}
                            {isCourse && (slot.hallIds?.length || 0) > 0 && (
                              <span className="text-xs text-gray-500 truncate">
                                🏛 {slot.hallIds!.length} hall{slot.hallIds!.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {isCourse && (slot.studentGroupIds?.length || 0) > 0 && (
                              <span className="text-xs text-gray-500 truncate">
                                👥 {slot.studentGroupIds!.length} group{slot.studentGroupIds!.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {!readOnly && (
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(day, index) }}
                                className="text-xs text-red-400 hover:text-red-600 text-left mt-auto"
                              >
                                ✕ remove
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    }

                    // Empty cell
                    return (
                      <td
                        key={slotIdx}
                        className="p-1 border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                        onClick={() => openNewSlot(day, slotIdx)}
                      >
                        {!readOnly && (
                          <span className="text-xs text-gray-300 select-none">+</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail card — shown when a filled slot is selected */}
        {detailSlot && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">{detailSlot.day} · Slot {detailSlot.slot.slotNumber + 1}{detailSlot.slot.slotSpan > 1 ? `–${detailSlot.slot.slotNumber + detailSlot.slot.slotSpan}` : ''}</p>
                <h3 className="font-semibold text-gray-900 text-sm mt-0.5">
                  {detailSlot.slot.type === 'course'
                    ? (detailSlot.slot.courseCode || 'Course')
                    : (detailSlot.slot.blockerReason || 'Blocker')}
                </h3>
                {detailSlot.slot.type === 'course' && (() => {
                  const c = courses.find(x => x.id === detailSlot.slot.courseId)
                  return c ? <p className="text-xs text-gray-500 mt-0.5">{c.name}</p> : null
                })()}
              </div>
              <button onClick={() => { setDetailSlot(null); setDetailEntities(null) }} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">×</button>
            </div>

            <div className="p-4 space-y-4 flex-1 text-sm">
              {detailSlot.slot.type === 'blocker' ? (
                <p className="text-gray-500 italic">Blocker — no entities involved.</p>
              ) : loadingDetail ? (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                  Loading details...
                </div>
              ) : detailEntities ? (
                <>
                  {/* Course meta */}
                  {(() => {
                    const c = courses.find(x => x.id === detailSlot.slot.courseId)
                    if (!c) return null
                    return (
                      <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-semibold text-blue-800 uppercase">Course</p>
                        <p className="text-sm font-medium text-blue-900">{c.code} — {c.name}</p>
                        <p className="text-xs text-blue-700">Span: {detailSlot.slot.slotSpan} slot{detailSlot.slot.slotSpan !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-blue-700">{c.scheduledCount}/{c.totalSessions} sessions scheduled</p>
                      </div>
                    )
                  })()}

                  {/* Faculty */}
                  {detailEntities.faculties.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Faculty ({detailEntities.faculties.length})</p>
                      <div className="space-y-1">
                        {detailEntities.faculties.map(f => (
                          <div key={f.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-400">👤</span>
                            <span className="text-gray-800">{f.name}</span>
                            {f.shortForm && <span className="text-xs text-gray-400 ml-auto">{f.shortForm}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Faculty Groups */}
                  {detailEntities.facultyGroups.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Faculty Groups ({detailEntities.facultyGroups.length})</p>
                      <div className="space-y-1">
                        {detailEntities.facultyGroups.map(g => (
                          <div key={g.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-400">👥</span>
                            <span className="text-gray-800">{g.groupName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Halls */}
                  {detailEntities.halls.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Halls ({detailEntities.halls.length})</p>
                      <div className="space-y-1">
                        {detailEntities.halls.map(h => (
                          <div key={h.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-400">🏛</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-800 truncate">{h.name}</p>
                              <p className="text-xs text-gray-400">{h.Building}, Floor {h.Floor}</p>
                            </div>
                            {h.shortForm && <span className="text-xs text-gray-400 shrink-0">{h.shortForm}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hall Groups */}
                  {detailEntities.hallGroups.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Hall Groups ({detailEntities.hallGroups.length})</p>
                      <div className="space-y-1">
                        {detailEntities.hallGroups.map(g => (
                          <div key={g.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-400">🏢</span>
                            <span className="text-gray-800">{g.groupName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Groups */}
                  {detailEntities.studentGroups.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Student Groups ({detailEntities.studentGroups.length})</p>
                      <div className="space-y-1">
                        {detailEntities.studentGroups.map(g => (
                          <div key={g.id} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-400">🎓</span>
                            <span className="text-gray-800">{g.groupName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student count */}
                  {(detailSlot.slot.studentIds?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Students</p>
                      <div className="bg-gray-50 rounded px-2 py-1 text-gray-700 text-sm">
                        {detailSlot.slot.studentIds!.length} student{detailSlot.slot.studentIds!.length !== 1 ? 's' : ''} enrolled
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Side panel — edit/add */}
        {panelOpen && !readOnly && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                {editingIndex !== null ? 'Edit Slot' : 'Add Slot'} — {editingDay} Slot {editingSlot.slotNumber + 1}
              </h3>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>

            <div className="p-4 space-y-4 flex-1">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editingSlot.type}
                  onChange={e => setEditingSlot(s => ({ ...s, type: e.target.value as 'course' | 'blocker' }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="course">Course</option>
                  <option value="blocker">Blocker</option>
                </select>
              </div>

              {/* Slot number */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Starting Slot</label>
                <select
                  value={editingSlot.slotNumber}
                  onChange={e => setEditingSlot(s => ({ ...s, slotNumber: parseInt(e.target.value) }))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
                    <option key={i} value={i}>{SLOT_LABELS[i]}</option>
                  ))}
                </select>
              </div>

              {/* Slot span — only for blockers (courses use sessionsPerLecture) */}
              {editingSlot.type === 'blocker' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Span (slots)</label>
                  <select
                    value={editingSlot.slotSpan}
                    onChange={e => setEditingSlot(s => ({ ...s, slotSpan: parseInt(e.target.value) }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} slot{i > 0 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Course picker */}
              {editingSlot.type === 'course' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                  <select
                    value={editingSlot.courseId || ''}
                    onChange={e => {
                      const course = courses.find(c => c.id === e.target.value)
                      setEditingSlot(s => ({
                        ...s,
                        courseId: e.target.value || undefined,
                        courseCode: course?.code || '',
                        slotSpan: course?.sessionsPerLecture || 1
                      }))
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select course...</option>
                    {courseOptions.map(c => (
                      <option key={c.id} value={c.id} disabled={isCourseFullyScheduled(c.id) && editingIndex === null}>
                        {c.code} — {c.name} ({c.scheduledCount}/{c.totalSessions})
                        {isCourseFullyScheduled(c.id) ? ' [full]' : ''}
                      </option>
                    ))}
                  </select>
                  {editingSlot.courseId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Span: {courses.find(c => c.id === editingSlot.courseId)?.sessionsPerLecture || 1} slot(s) (from course)
                    </p>
                  )}
                </div>
              )}

              {/* Blocker reason */}
              {editingSlot.type === 'blocker' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={editingSlot.blockerReason || ''}
                    onChange={e => setEditingSlot(s => ({ ...s, blockerReason: e.target.value }))}
                    placeholder="e.g. Lunch Break, EAA..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs font-medium text-red-800 mb-1">Conflicts detected:</p>
                  {conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-red-700">{c}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setPanelOpen(false)}
                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOrUpdate}
                disabled={checkingConflicts}
                className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingConflicts ? 'Checking...' : editingIndex !== null ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
