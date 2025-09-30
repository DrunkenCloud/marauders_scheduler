import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse, SessionConfig } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const sessionId = parseInt(idParam)
    
    if (isNaN(sessionId)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Invalid session ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: ApiResponse<SessionConfig> = {
      success: true,
      data: {
        ...session,
        details: session.details ?? undefined
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching session:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_SESSION_ERROR',
        message: 'Failed to fetch session',
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
    const { id: idParam } = await params
    const sessionId = parseInt(idParam)
    const body = await request.json()
    const { name, details } = body

    if (isNaN(sessionId)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Invalid session ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        ...(name && { name }),
        ...(details !== undefined && { details })
      }
    })

    const response: ApiResponse<SessionConfig> = {
      success: true,
      data: {
        ...session,
        details: session.details ?? undefined
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error updating session:', error)
    
    let errorMessage = 'Failed to update session'
    if (error.code === 'P2002') {
      errorMessage = 'Session name already exists'
    } else if (error.code === 'P2025') {
      errorMessage = 'Session not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_SESSION_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const sessionId = parseInt(idParam)

    if (isNaN(sessionId)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Invalid session ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    await prisma.session.delete({
      where: { id: sessionId }
    })

    const response: ApiResponse = {
      success: true,
      data: { message: 'Session deleted successfully' }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error deleting session:', error)
    
    let errorMessage = 'Failed to delete session'
    if (error.code === 'P2025') {
      errorMessage = 'Session not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_SESSION_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}