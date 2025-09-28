import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const search = searchParams.get('search')
    const building = searchParams.get('building')
    const floor = searchParams.get('floor')
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
      sessionId: parseInt(sessionId),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { shortForm: { contains: search, mode: 'insensitive' as const } }
        ]
      }),
      ...(building && { Building: { contains: building, mode: 'insensitive' as const } }),
      ...(floor && { Floor: { contains: floor, mode: 'insensitive' as const } })
    }

    const [halls, total] = await Promise.all([
      prisma.hall.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { Building: 'asc' },
          { Floor: 'asc' },
          { name: 'asc' }
        ],
        include: {
          session: true,
          hallGroupMemberships: {
            include: {
              hallGroup: true
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
      prisma.hall.count({ where })
    ])

    // Get unique buildings and floors for filtering
    const allHalls = await prisma.hall.findMany({
      where: { sessionId: parseInt(sessionId) },
      select: { Building: true, Floor: true },
      distinct: ['Building', 'Floor']
    })

    const buildings = [...new Set(allHalls.map(h => h.Building))].sort()
    const floors = [...new Set(allHalls.map(h => h.Floor))].sort()

    const response: ApiResponse = {
      success: true,
      data: {
        halls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters: {
          buildings,
          floors
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching halls:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_HALLS_ERROR',
        message: 'Failed to fetch halls',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, floor, building, shortForm, sessionId, timetable = {} } = body

    if (!name || !floor || !building || !sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, Floor, Building, and Session ID are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Initialize empty timetable if not provided (halls can have partial timetables)
    const defaultTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }

    const hall = await prisma.hall.create({
      data: {
        name: name.trim(),
        Floor: floor.trim(),
        Building: building.trim(),
        shortForm: shortForm?.trim() || null,
        sessionId: parseInt(sessionId),
        timetable: timetable || defaultTimetable
      },
      include: {
        session: true,
        hallGroupMemberships: {
          include: {
            hallGroup: true
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
      data: hall
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error creating hall:', error)
    
    let errorMessage = 'Failed to create hall'
    if (error.code === 'P2002') {
      errorMessage = 'A hall with this information already exists'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CREATE_HALL_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}