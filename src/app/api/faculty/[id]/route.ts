import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid faculty ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id },
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

    if (!faculty) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Faculty not found',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: ApiResponse = {
      success: true,
      data: faculty
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, shortForm, timetable, startHour, startMinute, endHour, endMinute } = body
    
    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid faculty ID',
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
    if (shortForm !== undefined) {
      updateData.shortForm = shortForm?.trim() || null
    }
    if (timetable !== undefined) {
      updateData.timetable = timetable
    }

    // Validate and update timing fields if provided
    if (startHour !== undefined) {
      if (startHour < 0 || startHour > 23) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Start hour must be between 0 and 23',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.startHour = parseInt(startHour)
    }
    if (startMinute !== undefined) {
      if (startMinute < 0 || startMinute > 59) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Start minute must be between 0 and 59',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.startMinute = parseInt(startMinute)
    }
    if (endHour !== undefined) {
      if (endHour < 0 || endHour > 23) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'End hour must be between 0 and 23',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.endHour = parseInt(endHour)
    }
    if (endMinute !== undefined) {
      if (endMinute < 0 || endMinute > 59) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'End minute must be between 0 and 59',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.endMinute = parseInt(endMinute)
    }

    const faculty = await prisma.faculty.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error updating faculty:', error)
    
    let errorMessage = 'Failed to update faculty'
    if (error.code === 'P2002') {
      errorMessage = 'A faculty member with this information already exists'
    } else if (error.code === 'P2025') {
      errorMessage = 'Faculty not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_FACULTY_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: error.code === 'P2025' ? 404 : 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid faculty ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Check if faculty is teaching any courses
    const courseCount = await prisma.course.count({
      where: {
        compulsoryFaculties: {
          some: { id }
        }
      }
    })

    if (courseCount > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONSTRAINT_ERROR',
          message: `Cannot delete faculty. Faculty is assigned to ${courseCount} course(s). Please remove course assignments first.`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    await prisma.faculty.delete({
      where: { id }
    })

    const response: ApiResponse = {
      success: true,
      data: { message: 'Faculty deleted successfully' }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error deleting faculty:', error)
    
    let errorMessage = 'Failed to delete faculty'
    if (error.code === 'P2025') {
      errorMessage = 'Faculty not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_FACULTY_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: error.code === 'P2025' ? 404 : 500 })
  }
}