import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, scheduledSlots } = body

    if (!sessionId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Session ID is required', timestamp: new Date() }
      }
      return NextResponse.json(response, { status: 400 })
    }

    if (!scheduledSlots || !Array.isArray(scheduledSlots) || scheduledSlots.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'scheduledSlots array is required and must not be empty', timestamp: new Date() }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate slot structure
    const invalidSlots = scheduledSlots.filter(slot =>
      !slot.courseId || !slot.courseCode || !slot.day ||
      typeof slot.slotNumber !== 'number' || typeof slot.slotSpan !== 'number'
    )
    if (invalidSlots.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${invalidSlots.length} slots have missing required fields (courseId, courseCode, day, slotNumber, slotSpan)`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Collect all entity IDs that need timetable updates
    const entityTimetableUpdates: Map<string, { type: string; timetable: any }> = new Map()

    // Helper: get or load entity timetable
    const getEntityTimetable = async (id: string, type: string): Promise<any> => {
      if (entityTimetableUpdates.has(id)) return entityTimetableUpdates.get(id)!.timetable

      let entity: any = null
      switch (type) {
        case 'student': entity = await prisma.student.findUnique({ where: { id } }); break
        case 'faculty': entity = await prisma.faculty.findUnique({ where: { id } }); break
        case 'hall': entity = await prisma.hall.findUnique({ where: { id } }); break
        case 'studentGroup': entity = await prisma.studentGroup.findUnique({ where: { id } }); break
        case 'facultyGroup': entity = await prisma.facultyGroup.findUnique({ where: { id } }); break
        case 'hallGroup': entity = await prisma.hallGroup.findUnique({ where: { id } }); break
      }

      if (!entity) return null
      const timetable = entity.timetable && typeof entity.timetable === 'object'
        ? JSON.parse(JSON.stringify(entity.timetable))
        : Object.fromEntries(DAYS.map(d => [d, []]))

      // Ensure all days exist
      for (const day of DAYS) {
        if (!Array.isArray(timetable[day])) timetable[day] = []
      }

      entityTimetableUpdates.set(id, { type, timetable })
      return timetable
    }

    // Apply each scheduled slot to all involved entities
    for (const slot of scheduledSlots) {
      const { day, slotNumber, slotSpan, courseId, courseCode,
        studentIds = [], facultyIds = [], hallIds = [],
        studentGroupIds = [], facultyGroupIds = [], hallGroupIds = [] } = slot

      const slotEntry = {
        type: 'course',
        slotNumber,
        slotSpan,
        courseId,
        courseCode,
        studentIds,
        facultyIds,
        hallIds,
        studentGroupIds,
        facultyGroupIds,
        hallGroupIds
      }

      const entityPairs: Array<[string, string]> = [
        ...studentIds.map((id: string) => [id, 'student'] as [string, string]),
        ...facultyIds.map((id: string) => [id, 'faculty'] as [string, string]),
        ...hallIds.map((id: string) => [id, 'hall'] as [string, string]),
        ...studentGroupIds.map((id: string) => [id, 'studentGroup'] as [string, string]),
        ...facultyGroupIds.map((id: string) => [id, 'facultyGroup'] as [string, string]),
        ...hallGroupIds.map((id: string) => [id, 'hallGroup'] as [string, string])
      ]

      for (const [id, type] of entityPairs) {
        const timetable = await getEntityTimetable(id, type)
        if (!timetable) continue
        if (!Array.isArray(timetable[day])) timetable[day] = []
        timetable[day].push(slotEntry)
        timetable[day].sort((a: any, b: any) => a.slotNumber - b.slotNumber)
      }
    }

    // Also update course scheduledCount
    const courseScheduledCounts: Map<string, number> = new Map()
    for (const slot of scheduledSlots) {
      courseScheduledCounts.set(slot.courseId, (courseScheduledCounts.get(slot.courseId) || 0) + 1)
    }

    // Persist all timetable updates + course counts in a transaction
    await prisma.$transaction(async (tx) => {
      for (const [id, { type, timetable }] of entityTimetableUpdates.entries()) {
        switch (type) {
          case 'student': await tx.student.update({ where: { id }, data: { timetable } }); break
          case 'faculty': await tx.faculty.update({ where: { id }, data: { timetable } }); break
          case 'hall': await tx.hall.update({ where: { id }, data: { timetable } }); break
          case 'studentGroup': await tx.studentGroup.update({ where: { id }, data: { timetable } }); break
          case 'facultyGroup': await tx.facultyGroup.update({ where: { id }, data: { timetable } }); break
          case 'hallGroup': await tx.hallGroup.update({ where: { id }, data: { timetable } }); break
        }
      }

      for (const [courseId, count] of courseScheduledCounts.entries()) {
        await tx.course.update({
          where: { id: courseId },
          data: { scheduledCount: { increment: count } }
        })
      }
    })

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully committed ${scheduledSlots.length} scheduled sessions`,
        sessionId,
        committedSlotsCount: scheduledSlots.length,
        entitiesUpdated: entityTimetableUpdates.size,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error committing scheduled slots:', error)
    const response: ApiResponse = {
      success: false,
      error: { code: 'COMMIT_ERROR', message: 'Failed to commit scheduled slots', timestamp: new Date() }
    }
    return NextResponse.json(response, { status: 500 })
  }
}
