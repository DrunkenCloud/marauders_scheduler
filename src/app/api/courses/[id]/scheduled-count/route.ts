import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = parseInt(id)
    const { increment } = await request.json()

    if (isNaN(courseId)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_COURSE_ID',
          message: 'Invalid course ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    if (typeof increment !== 'number') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_INCREMENT',
          message: 'Increment must be a number',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Update the scheduled count
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        scheduledCount: {
          increment: increment
        }
      },
      select: {
        id: true,
        code: true,
        name: true,
        scheduledCount: true,
        totalSessions: true
      }
    })

    const response: ApiResponse = {
      success: true,
      data: updatedCourse
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating course scheduled count:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_SCHEDULED_COUNT_ERROR',
        message: 'Failed to update course scheduled count',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}