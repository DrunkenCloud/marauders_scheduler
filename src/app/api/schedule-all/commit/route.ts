import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'
import { updateEntityTimetables } from '../algo'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, scheduledSlots } = body

    console.log('Schedule Commit Request received:')
    console.log('Session ID:', sessionId)
    console.log('Scheduled Slots Count:', scheduledSlots?.length || 0)

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

    if (!scheduledSlots || !Array.isArray(scheduledSlots) || scheduledSlots.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Scheduled slots array is required and must not be empty',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate scheduled slots structure
    const invalidSlots = scheduledSlots.filter(slot => 
      !slot.courseId || 
      !slot.courseCode ||
      !slot.day ||
      typeof slot.startHour !== 'number' ||
      typeof slot.startMinute !== 'number' ||
      typeof slot.duration !== 'number'
    )
    
    if (invalidSlots.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid scheduled slots found: ${invalidSlots.length} slots have missing required fields`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    console.log(`Committing ${scheduledSlots.length} scheduled slots to database...`)

    // Update entity timetables with the scheduled slots
    await updateEntityTimetables(scheduledSlots, sessionId)

    console.log('Successfully committed all scheduled slots to database')

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully committed ${scheduledSlots.length} scheduled sessions to the database`,
        sessionId,
        committedSlotsCount: scheduledSlots.length,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error committing scheduled slots:', error)

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'COMMIT_ERROR',
        message: 'Failed to commit scheduled slots to database',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}