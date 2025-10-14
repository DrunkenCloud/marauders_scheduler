import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    if (!sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session ID is required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const where = {
      sessionId: sessionId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { shortForm: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [faculty, total] = await Promise.all([
      prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          session: true,
          facultyGroupMemberships: {
            include: {
              facultyGroup: true
            }
          },
          coursesTaught: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      }),
      prisma.faculty.count({ where })
    ])

    const response: ApiResponse = {
      success: true,
      data: {
        faculty,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching faculty:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_FACULTY_ERROR',
        message: 'Failed to fetch faculty',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      shortForm, 
      sessionId, 
      timetable = {},
      startHour = 8,
      startMinute = 10,
      endHour = 20,
      endMinute = 0
    } = body

    if (!name || !sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and Session ID are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate timing fields
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Hours must be between 0 and 23',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    if (startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Minutes must be between 0 and 59',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Initialize empty timetable if not provided (faculty can have partial timetables)
    const defaultTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }

    const faculty = await prisma.faculty.create({
      data: {
        name: name.trim(),
        shortForm: shortForm?.trim() || null,
        sessionId: sessionId,
        timetable: timetable || defaultTimetable,
        startHour: parseInt(startHour),
        startMinute: parseInt(startMinute),
        endHour: parseInt(endHour),
        endMinute: parseInt(endMinute)
      },
      include: {
        session: true,
        facultyGroupMemberships: {
          include: {
            facultyGroup: true
          }
        },
        coursesTaught: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    const response: ApiResponse = {
      success: true,
      data: faculty
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error creating faculty:', error)
    
    let errorMessage = 'Failed to create faculty'
    if (error.code === 'P2002') {
      errorMessage = 'A faculty member with this information already exists'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CREATE_FACULTY_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}