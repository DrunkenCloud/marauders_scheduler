import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/faculty-groups - Get all faculty groups for current session
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

    const facultyGroups = await prisma.facultyGroup.findMany({
      where: {
        sessionId: sessionId
      },
      include: {
        facultyMemberships: {
          include: {
            faculty: {
              select: {
                id: true,
                name: true,
                shortForm: true
              }
            }
          }
        },
        _count: {
          select: {
            facultyMemberships: true
          }
        }
      },
      orderBy: {
        groupName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: facultyGroups
    } as ApiResponse)

  } catch (error) {
    console.error('Error fetching faculty groups:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch faculty groups',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// POST /api/faculty-groups - Create new faculty group
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
    const existingGroup = await prisma.facultyGroup.findFirst({
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
          message: 'A faculty group with this name already exists in the current session',
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

    const facultyGroup = await prisma.facultyGroup.create({
      data: {
        groupName,
        sessionId: sessionId,
        timetable: emptyTimetable,
        startHour: startHour || 8,
        startMinute: startMinute || 10,
        endHour: endHour || 17,
        endMinute: endMinute || 0
      },
      include: {
        _count: {
          select: {
            facultyMemberships: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: facultyGroup
    } as ApiResponse, { status: 201 })

  } catch (error) {
    console.error('Error creating faculty group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create faculty group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}