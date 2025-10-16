import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'
import { compileSchedulingData, scheduleCourses } from './algo'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, courseIds } = body

    // Log the request body for debugging
    console.log('Schedule All Request received:')
    console.log('Session ID:', sessionId)
    console.log('Course IDs:', courseIds)
    console.log('Full request body:', JSON.stringify(body, null, 2))

    // Validate required fields
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

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Course IDs array is required and must not be empty',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate that all courseIds are strings (UUIDs)
    const invalidCourseIds = courseIds.filter(id => typeof id !== 'string' || !id.trim())
    if (invalidCourseIds.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid course IDs: ${invalidCourseIds.join(', ')}`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const compiled = await compileSchedulingData(sessionId, courseIds)

    console.log(`Scheduling compilation complete for ${courseIds.length} courses in session ${sessionId}`)

    // Run the scheduling algorithm
    const schedulingResult = scheduleCourses(compiled);
    console.log(JSON.stringify(schedulingResult, null, 2));

    const response: ApiResponse = {
      success: schedulingResult.success,
      data: {
        message: schedulingResult.message,
        sessionId,
        courseIds,
        coursesCount: courseIds.length,
        scheduledSlots: schedulingResult.scheduledSlots || [],
        timestamp: new Date()
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing schedule-all request:', error)

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'SCHEDULE_ALL_ERROR',
        message: 'Failed to process scheduling request',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}