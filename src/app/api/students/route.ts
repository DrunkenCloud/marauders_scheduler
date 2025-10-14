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
        digitalId: {
          equals: isNaN(parseInt(search)) ? undefined : parseInt(search)
        }
      })
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { digitalId: 'asc' },
        include: {
          session: true,
          studentGroupMemberships: {
            include: {
              studentGroup: true
            }
          }
        }
      }),
      prisma.student.count({ where })
    ])

    const response: ApiResponse = {
      success: true,
      data: {
        students,
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
    console.error('Error fetching students:', error)

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_STUDENTS_ERROR',
        message: 'Failed to fetch students',
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
      digitalId,
      sessionId,
      timetable = {},
      startHour = 8,
      startMinute = 10,
      endHour = 15,
      endMinute = 30
    } = body

    if (!digitalId || !sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Digital ID and Session ID are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate digitalId is a number
    if (isNaN(parseInt(digitalId))) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Digital ID must be a valid number',
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

    // Initialize empty timetable if not provided
    const defaultTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }

    const student = await prisma.student.create({
      data: {
        digitalId: parseInt(digitalId),
        sessionId: sessionId,
        timetable: timetable || defaultTimetable,
        startHour: parseInt(startHour),
        startMinute: parseInt(startMinute),
        endHour: parseInt(endHour),
        endMinute: parseInt(endMinute)
      },
      include: {
        session: true,
        studentGroupMemberships: {
          include: {
            studentGroup: true
          }
        }
      }
    })

    const response: ApiResponse = {
      success: true,
      data: student
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error creating student:', error)

    let errorMessage = 'Failed to create student'
    if (error.code === 'P2002') {
      errorMessage = 'A student with this Digital ID already exists'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CREATE_STUDENT_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}