import { NextRequest, NextResponse } from 'next/server'
import { newImportContext, importDumpInto } from '@/lib/importSession'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, data } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const ctx = newImportContext()
    await importDumpInto(sessionId, data, ctx)
    return NextResponse.json({ success: true, stats: ctx.stats })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message || 'Failed to import data' }, { status: 500 })
  }
}
