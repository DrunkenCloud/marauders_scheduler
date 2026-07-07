import { NextRequest, NextResponse } from 'next/server'
import { newImportContext, importDumpInto } from '@/lib/importSession'

// Merge-import: several exported dumps into ONE session. Shared entities (faculty,
// classes, halls, groups, students) are deduped by their source id across files, so
// the scheduler sees a single row and can catch cross-file conflicts. Courses and
// their allocations are kept separate per file.
export async function POST(request: NextRequest) {
  try {
    const { sessionId, files } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files array is required and must not be empty' }, { status: 400 })
    }

    const ctx = newImportContext()
    for (const data of files) {
      await importDumpInto(sessionId, data, ctx)
    }
    return NextResponse.json({ success: true, filesImported: files.length, stats: ctx.stats })
  } catch (error: any) {
    console.error('Merge import error:', error)
    return NextResponse.json({ error: error.message || 'Failed to import data' }, { status: 500 })
  }
}
