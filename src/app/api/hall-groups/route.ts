import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/hall-groups - Get all hall groups for current session
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

    const hallGroups = await prisma.hallGroup.findMany({
      where: {
        sessionId: sessionId
      },
      include: {
        hallMemberships: {
          include: {
            hall: {
              select: {
                id: true,
                name: true,
                Floor: true,
                Building: true,
                shortForm: true
              }
            }
          }
        },
        _count: {
          select: {
            hallMemberships: true
          }
        }
      },
      orderBy: {
        groupName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: hallGroups
    } as ApiResponse)

  } catch (error) {
    console.error('Error fetching hall groups:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch hall groups',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// POST /api/hall-groups - Create new hall group
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
    const existingGroup = await prisma.hallGroup.findFirst({
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
          message: 'A hall group with this name already exists in the current session',
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

    const hallGroup = await prisma.hallGroup.create({
      data: {
        groupName,
        sessionId: sessionId,
        timetable: emptyTimetable,
        startHour: startHour || 8,
        startMinute: startMinute || 10,
        endHour: endHour || 20,
        endMinute: endMinute || 0
      },
      include: {
        _count: {
          select: {
            hallMemberships: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: hallGroup
    } as ApiResponse, { status: 201 })

  } catch (error) {
    console.error('Error creating hall group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create hall group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}