import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid student ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        session: true,
        studentGroupMemberships: {
          include: {
            studentGroup: true
          }
        },
        courseEnrollments: {
          include: {
            course: true
          }
        }
      }
    })

    if (!student) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Student not found',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: ApiResponse = {
      success: true,
      data: student
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching student:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_STUDENT_ERROR',
        message: 'Failed to fetch student',
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
    const { digitalId, timetable, startHour, startMinute, endHour, endMinute } = body
    
    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid student ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate digitalId if provided
    if (digitalId !== undefined && isNaN(parseInt(digitalId))) {
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

    // Validate timing fields if provided
    if (startHour !== undefined && (startHour < 0 || startHour > 23)) {
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

    if (endHour !== undefined && (endHour < 0 || endHour > 23)) {
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

    if (startMinute !== undefined && (startMinute < 0 || startMinute > 59)) {
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

    if (endMinute !== undefined && (endMinute < 0 || endMinute > 59)) {
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

    const updateData: any = {}
    if (digitalId !== undefined) {
      updateData.digitalId = parseInt(digitalId)
    }
    if (timetable !== undefined) {
      updateData.timetable = timetable
    }
    if (startHour !== undefined) {
      updateData.startHour = parseInt(startHour)
    }
    if (startMinute !== undefined) {
      updateData.startMinute = parseInt(startMinute)
    }
    if (endHour !== undefined) {
      updateData.endHour = parseInt(endHour)
    }
    if (endMinute !== undefined) {
      updateData.endMinute = parseInt(endMinute)
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error updating student:', error)
    
    let errorMessage = 'Failed to update student'
    if (error.code === 'P2002') {
      errorMessage = 'A student with this Digital ID already exists'
    } else if (error.code === 'P2025') {
      errorMessage = 'Student not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_STUDENT_ERROR',
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
          message: 'Invalid student ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Check if student has course enrollments
    const enrollmentCount = await prisma.courseStudentEnrollment.count({
      where: { studentId: id }
    })

    if (enrollmentCount > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONSTRAINT_ERROR',
          message: `Cannot delete student. Student is enrolled in ${enrollmentCount} course(s). Please remove enrollments first.`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    await prisma.student.delete({
      where: { id }
    })

    const response: ApiResponse = {
      success: true,
      data: { message: 'Student deleted successfully' }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error deleting student:', error)
    
    let errorMessage = 'Failed to delete student'
    if (error.code === 'P2025') {
      errorMessage = 'Student not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_STUDENT_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: error.code === 'P2025' ? 404 : 500 })
  }
}