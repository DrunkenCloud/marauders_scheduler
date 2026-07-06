import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
// Entity-type strings double as prisma model accessor names (prisma.studentGroup, ...)
const ENTITY_MODELS = new Set(['student', 'faculty', 'hall', 'course', 'studentGroup', 'facultyGroup', 'hallGroup'])

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ success: false, error: { code, message, timestamp: new Date() } } as ApiResponse, { status })

const model = (db: any, type: string) => db[type]

function normalizeTt(tt: any): any {
  const out = tt && typeof tt === 'object' ? JSON.parse(JSON.stringify(tt)) : {}
  for (const d of DAYS) if (!Array.isArray(out[d])) out[d] = []
  return out
}

// A course slot's participants (the entities that keep a denormalized copy of it).
function participantsOf(slot: any): Array<[string, string]> {
  const arrs: Array<[string[] | undefined, string]> = [
    [slot.studentIds, 'student'], [slot.facultyIds, 'faculty'], [slot.hallIds, 'hall'],
    [slot.studentGroupIds, 'studentGroup'], [slot.facultyGroupIds, 'facultyGroup'], [slot.hallGroupIds, 'hallGroup'],
  ]
  return arrs.flatMap(([ids, type]) => (ids ?? []).map(id => [id, type] as [string, string]))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') || ''
    const entityId = searchParams.get('entityId')
    const sessionId = searchParams.get('sessionId')

    if (!entityType || !entityId || !sessionId)
      return err('VALIDATION_ERROR', 'Entity type, entity ID, and session ID are required', 400)
    if (!ENTITY_MODELS.has(entityType))
      return err('INVALID_ENTITY_TYPE', 'Invalid entity type', 400)

    const entity = await model(prisma, entityType).findFirst({ where: { id: entityId, sessionId }, select: { id: true, timetable: true } })
    if (!entity) return err('ENTITY_NOT_FOUND', 'Entity not found', 404)

    return NextResponse.json({ success: true, data: { timetable: entity.timetable } } as ApiResponse)
  } catch (error) {
    console.error('Error fetching timetable:', error)
    return err('FETCH_TIMETABLE_ERROR', 'Failed to fetch timetable', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { entityType, entityId, sessionId, timetable } = await request.json()

    if (!entityType || !entityId || !sessionId || !timetable)
      return err('VALIDATION_ERROR', 'Entity type, entity ID, session ID, and timetable are required', 400)
    if (!ENTITY_MODELS.has(entityType))
      return err('INVALID_ENTITY_TYPE', 'Invalid entity type', 400)

    const existing = await model(prisma, entityType).findFirst({ where: { id: entityId, sessionId }, select: { timetable: true } })
    if (!existing) return err('ENTITY_NOT_FOUND', 'Entity not found', 404)

    const newTt = normalizeTt(timetable)

    // Course slots are denormalized: the same slot lives in every participant's timetable.
    // A manual edit only rewrites THIS entity, so we must fan the diff out to the rest.
    // Approach: remove every old course slot from its participants, then add every new one.
    // Unchanged slots cancel out; removed slots vanish everywhere; added/edited slots propagate.
    const courseSlots = (tt: any) =>
      DAYS.flatMap(day => (tt[day] as any[]).filter(s => s?.type === 'course' && s.courseId).map(s => ({ ...s, day })))
    const oldSlots = courseSlots(normalizeTt(existing.timetable))
    const newSlots = courseSlots(newTt)

    // Lazily-loaded participant timetables (never the edited entity — it's saved directly).
    const touched = new Map<string, { type: string; tt: any }>()
    const loadParticipant = async (id: string, type: string) => {
      if (id === entityId) return null
      if (touched.has(id)) return touched.get(id)!.tt
      const ent = await model(prisma, type).findUnique({ where: { id }, select: { timetable: true } })
      if (!ent) return null
      const tt = normalizeTt(ent.timetable)
      touched.set(id, { type, tt })
      return tt
    }
    const matches = (s: any, courseId: string, slotNumber: number) =>
      s?.type === 'course' && s.courseId === courseId && s.slotNumber === slotNumber

    for (const slot of oldSlots) {
      for (const [id, type] of participantsOf(slot)) {
        const tt = await loadParticipant(id, type)
        if (tt) tt[slot.day] = tt[slot.day].filter((s: any) => !matches(s, slot.courseId, slot.slotNumber))
      }
    }
    for (const slot of newSlots) {
      const { day, ...entry } = slot
      for (const [id, type] of participantsOf(slot)) {
        const tt = await loadParticipant(id, type)
        if (tt && !tt[day].some((s: any) => matches(s, slot.courseId, slot.slotNumber))) {
          tt[day].push(entry)
          tt[day].sort((a: any, b: any) => a.slotNumber - b.slotNumber)
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const self = await model(tx, entityType).update({ where: { id: entityId }, data: { timetable: newTt }, select: { timetable: true } })
      for (const [id, { type, tt }] of touched) {
        await model(tx, type).update({ where: { id }, data: { timetable: tt } })
      }
      return self
    })

    return NextResponse.json({ success: true, data: updated.timetable } as ApiResponse)
  } catch (error) {
    console.error('Error updating timetable:', error)
    return err('UPDATE_TIMETABLE_ERROR', 'Failed to update timetable', 500)
  }
}
