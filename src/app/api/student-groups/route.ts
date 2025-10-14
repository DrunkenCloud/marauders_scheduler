import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/student-groups - Get all student groups for current session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    const studentGroups = await prisma.studentGroup.findMany({
      where: {
        sessionId: sessionId
      },
      include: {
        studentMemberships: {
          include: {
            student: {
              select: {
                id: true,
                digitalId: true
              }
            }
          }
        },
        _count: {
          select: {
            studentMemberships: true
          }
        }
      },
      orderBy: {
        groupName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: studentGroups
    } as ApiResponse)

  } catch (error) {
    console.error('Error fetching student groups:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch student groups',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// POST /api/student-groups - Create new student group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupName, sessionId, startHour, startMinute, endHour, endMinute } = body

    if (!groupName || !sessionId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Group name and session ID are required',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    // Check if group name already exists
    const existingGroup = await prisma.studentGroup.findFirst({
      where: {
        groupName: groupName,
        sessionId: sessionId
      }
    })

    if (existingGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NAME_EXISTS',
          message: 'A student group with this name already exists in the current session',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 409 })
    }

    // Create empty timetable structure
    const emptyTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }

    const studentGroup = await prisma.studentGroup.create({
      data: {
        groupName,
        sessionId: sessionId,
        timetable: emptyTimetable,
        startHour: startHour || 8,
        startMinute: startMinute || 10,
        endHour: endHour || 15,
        endMinute: endMinute || 30
      },
      include: {
        _count: {
          select: {
            studentMemberships: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: studentGroup
    } as ApiResponse, { status: 201 })

  } catch (error) {
    console.error('Error creating student group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create student group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}