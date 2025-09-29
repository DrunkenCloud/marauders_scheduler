import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse, SessionConfig } from '@/types'

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const response: ApiResponse<SessionConfig[]> = {
      success: true,
      data: sessions
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_SESSIONS_ERROR',
        message: 'Failed to fetch sessions',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, details } = body

    if (!name) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session name is required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const session = await prisma.session.create({
      data: {
        name,
        details
      }
    })

    const response: ApiResponse<SessionConfig> = {
      success: true,
      data: session
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error creating session:', error)
    
    let errorMessage = 'Failed to create session'
    if (error.code === 'P2002') {
      errorMessage = 'Session name already exists'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CREATE_SESSION_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}