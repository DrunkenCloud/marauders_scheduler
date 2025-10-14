import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse, EntityType } from '@/types'
import { convertFromLegacyFormat, convertToLegacyFormat } from '@/lib/timetable'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') as EntityType
    const entityId = searchParams.get('entityId')
    const sessionId = searchParams.get('sessionId')

    if (!entityType || !entityId || !sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Entity type, entity ID, and session ID are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    let entity: any = null

    // Fetch entity based on type
    switch (entityType) {
      case EntityType.STUDENT:
        entity = await prisma.student.findFirst({
          where: { id: entityId, sessionId: sessionId },
          select: { id: true, timetable: true, startHour: true, startMinute: true, endHour: true, endMinute: true }
        })
        break
      case EntityType.FACULTY:
        entity = await prisma.faculty.findFirst({
          where: { id: entityId, sessionId: sessionId },
          select: { id: true, timetable: true, startHour: true, startMinute: true, endHour: true, endMinute: true }
        })
        break
      case EntityType.HALL:
        entity = await prisma.hall.findFirst({
          where: { id: entityId, sessionId: sessionId },
          select: { id: true, timetable: true, startHour: true, startMinute: true, endHour: true, endMinute: true }
        })
        break
      case EntityType.COURSE:
        entity = await prisma.course.findFirst({
          where: { id: entityId, sessionId: sessionId },
          select: { id: true, timetable: true }
        })
        break
      case EntityType.STUDENT_GROUP:
        entity = await prisma.studentGroup.findFirst({
          where: { id: entityId, sessionId: sessionId },
          select: { id: true, timetable: true, startHour: true, startMinute: true, endHour: true, endMinute: true }
        })
        break
      case EntityType.FACULTY_GROUP:
        entity = await prisma.facultyGroup.findFirst({
          where: { id: entityId, sessionId: sessionId },
          select: { id: true, timetable: true, startHour: true, startMinute: true, endHour: true, endMinute: true }
        })
        break
      case EntityType.HALL_GROUP:
        entity = await prisma.hallGroup.findFirst({
          where: { id: entityId, sessionId: sessionId },
          select: { id: true, timetable: true, startHour: true, startMinute: true, endHour: true, endMinute: true }
        })
        break
      default:
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_ENTITY_TYPE',
            message: 'Invalid entity type',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
    }

    if (!entity) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'ENTITY_NOT_FOUND',
          message: 'Entity not found',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    // Convert legacy timetable format to new format
    const timetable = convertFromLegacyFormat(
      entity.timetable || {},
      entityId,
      entityType
    )

    // Add entity timing information
    const entityTiming = entityType === EntityType.COURSE ? null : {
      startHour: entity.startHour || 8,
      startMinute: entity.startMinute || 10,
      endHour: entity.endHour || 15,
      endMinute: entity.endMinute || 30
    }

    const response: ApiResponse = {
      success: true,
      data: {
        timetable,
        entityTiming
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching timetable:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_TIMETABLE_ERROR',
        message: 'Failed to fetch timetable',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entityType, entityId, sessionId, timetable } = body

    if (!entityType || !entityId || !sessionId || !timetable) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Entity type, entity ID, session ID, and timetable are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }



    // Convert new timetable format to legacy format for database storage
    const legacyTimetable = convertToLegacyFormat(timetable)

    let updatedEntity: any = null

    // Update entity based on type
    switch (entityType) {
      case EntityType.STUDENT:
        updatedEntity = await prisma.student.update({
          where: { id: entityId },
          data: { timetable: legacyTimetable },
          select: { id: true, timetable: true }
        })
        break
      case EntityType.FACULTY:
        updatedEntity = await prisma.faculty.update({
          where: { id: entityId },
          data: { timetable: legacyTimetable },
          select: { id: true, timetable: true }
        })
        break
      case EntityType.HALL:
        updatedEntity = await prisma.hall.update({
          where: { id: entityId },
          data: { timetable: legacyTimetable },
          select: { id: true, timetable: true }
        })
        break
      case EntityType.COURSE:
        updatedEntity = await prisma.course.update({
          where: { id: entityId },
          data: { timetable: legacyTimetable },
          select: { id: true, timetable: true }
        })
        break
      case EntityType.STUDENT_GROUP:
        updatedEntity = await prisma.studentGroup.update({
          where: { id: entityId },
          data: { timetable: legacyTimetable },
          select: { id: true, timetable: true }
        })
        break
      case EntityType.FACULTY_GROUP:
        updatedEntity = await prisma.facultyGroup.update({
          where: { id: entityId },
          data: { timetable: legacyTimetable },
          select: { id: true, timetable: true }
        })
        break
      case EntityType.HALL_GROUP:
        updatedEntity = await prisma.hallGroup.update({
          where: { id: entityId },
          data: { timetable: legacyTimetable },
          select: { id: true, timetable: true }
        })
        break
      default:
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_ENTITY_TYPE',
            message: 'Invalid entity type',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
    }

    // Convert back to new format for response
    const updatedTimetable = convertFromLegacyFormat(
      updatedEntity.timetable || {},
      entityId,
      entityType as EntityType
    )

    const response: ApiResponse = {
      success: true,
      data: updatedTimetable
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating timetable:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_TIMETABLE_ERROR',
        message: 'Failed to update timetable',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}