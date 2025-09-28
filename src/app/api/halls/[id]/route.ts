import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid hall ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const hall = await prisma.hall.findUnique({
      where: { id },
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

    if (!hall) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Hall not found',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: ApiResponse = {
      success: true,
      data: hall
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching hall:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_HALL_ERROR',
        message: 'Failed to fetch hall',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { name, floor, building, shortForm, timetable } = body
    
    if (isNaN(id)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid hall ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) {
      if (!name.trim()) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name cannot be empty',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (floor !== undefined) {
      if (!floor.trim()) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Floor cannot be empty',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.Floor = floor.trim()
    }
    if (building !== undefined) {
      if (!building.trim()) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Building cannot be empty',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.Building = building.trim()
    }
    if (shortForm !== undefined) {
      updateData.shortForm = shortForm?.trim() || null
    }
    if (timetable !== undefined) {
      updateData.timetable = timetable
    }

    const hall = await prisma.hall.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error updating hall:', error)
    
    let errorMessage = 'Failed to update hall'
    if (error.code === 'P2002') {
      errorMessage = 'A hall with this information already exists'
    } else if (error.code === 'P2025') {
      errorMessage = 'Hall not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_HALL_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: error.code === 'P2025' ? 404 : 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid hall ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Check if hall is being used by any courses
    const courseCount = await prisma.course.count({
      where: {
        compulsoryHalls: {
          some: { id }
        }
      }
    })

    if (courseCount > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONSTRAINT_ERROR',
          message: `Cannot delete hall. Hall is assigned to ${courseCount} course(s). Please remove course assignments first.`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    await prisma.hall.delete({
      where: { id }
    })

    const response: ApiResponse = {
      success: true,
      data: { message: 'Hall deleted successfully' }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error deleting hall:', error)
    
    let errorMessage = 'Failed to delete hall'
    if (error.code === 'P2025') {
      errorMessage = 'Hall not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_HALL_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: error.code === 'P2025' ? 404 : 500 })
  }
}