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
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { digitalId, timetable } = body
    
    if (isNaN(id)) {
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

    const updateData: any = {}
    if (digitalId !== undefined) {
      updateData.digitalId = parseInt(digitalId)
    }
    if (timetable !== undefined) {
      updateData.timetable = timetable
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