import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'
import { compileSchedulingData, scheduleCourses } from './algo'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, courseConfigs, courseIds, randomSeed } = body

    // Support both old format (courseIds) and new format (courseConfigs)
    let finalCourseConfigs: Array<{ courseId: string, sessionsToSchedule: number }>

    if (courseConfigs && Array.isArray(courseConfigs)) {
      finalCourseConfigs = courseConfigs
    } else if (courseIds && Array.isArray(courseIds)) {
      // Convert old format to new format (schedule all remaining sessions)
      finalCourseConfigs = courseIds.map((courseId: string) => ({
        courseId,
        sessionsToSchedule: -1 // -1 means schedule all remaining sessions
      }))
    } else {
      finalCourseConfigs = []
    }

    // Log the request body for debugging
    console.log('Session ID:', sessionId)

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

    if (!finalCourseConfigs || finalCourseConfigs.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Course configurations are required and must not be empty',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate course configurations
    const invalidConfigs = finalCourseConfigs.filter(config => 
      !config.courseId || 
      typeof config.courseId !== 'string' || 
      !config.courseId.trim() ||
      (config.sessionsToSchedule !== -1 && (typeof config.sessionsToSchedule !== 'number' || config.sessionsToSchedule <= 0))
    )
    
    if (invalidConfigs.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid course configurations found`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const extractedCourseIds = finalCourseConfigs.map(config => config.courseId)
    const compiled = await compileSchedulingData(sessionId, extractedCourseIds);
    // console.log(JSON.stringify(compiled, null, 2))

    // Apply session limits to the compiled data
    for (const config of finalCourseConfigs) {
      const course = compiled.courses.find(c => c.courseId === config.courseId)
      if (course && config.sessionsToSchedule !== -1) {
        // Set a temporary target for this scheduling run
        const remainingSessions = course.totalSessions - course.scheduledCount
        course.targetSessions = Math.min(config.sessionsToSchedule, remainingSessions)
      }
    }

    // Run the scheduling algorithm
    const schedulingResult = scheduleCourses(compiled, randomSeed);
    // const schedulingResult = {
    //   "success": false,
    //   "message": "emwo",
    //   "scheduledSlots": []
    // }

    const totalSessionsToSchedule = finalCourseConfigs.reduce((total, config) => {
      if (config.sessionsToSchedule === -1) {
        const course = compiled.courses.find(c => c.courseId === config.courseId)
        return total + (course ? course.totalSessions - course.scheduledCount : 0)
      }
      return total + config.sessionsToSchedule
    }, 0)

    const response: ApiResponse = {
      success: schedulingResult.success,
      data: {
        message: schedulingResult.message,
        sessionId,
        courseConfigs: finalCourseConfigs,
        coursesCount: extractedCourseIds.length,
        totalSessionsToSchedule,
        scheduledSlots: schedulingResult.scheduledSlots || [],
        timestamp: new Date()
      }
    }

    console.log(response);
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