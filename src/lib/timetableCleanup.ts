import { prisma } from './prisma'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
// Every entity type whose timetable can hold a denormalized copy of a course slot.
const MODELS = ['student', 'faculty', 'hall', 'studentGroup', 'facultyGroup', 'hallGroup', 'course'] as const

const norm = (tt: any): any => {
  const o = tt && typeof tt === 'object' ? tt : {}
  for (const d of DAYS) if (!Array.isArray(o[d])) o[d] = []
  return o
}

// Drop matching slots from every day; returns true if anything was removed.
function stripDays(tt: any, drop: (slot: any) => boolean): boolean {
  let changed = false
  for (const d of DAYS) {
    const before = tt[d].length
    tt[d] = tt[d].filter((s: any) => !drop(s))
    if (tt[d].length !== before) changed = true
  }
  return changed
}

// ponytail: naive per-entity fetch, one findMany per model. Fine for session-sized
// data (dozens–hundreds of entities); batch the reads if a session ever gets huge.
async function persist(updates: Array<{ model: string; id: string; tt: any }>): Promise<number> {
  if (updates.length) {
    await prisma.$transaction(updates.map(u => (prisma as any)[u.model].update({ where: { id: u.id }, data: { timetable: u.tt } })))
  }
  return updates.length
}

/** Remove every slot matching `drop` from the given specific entities. */
export async function purgeSlotsFromEntities(refs: Array<{ model: string; id: string }>, drop: (slot: any) => boolean): Promise<number> {
  const updates: Array<{ model: string; id: string; tt: any }> = []
  for (const { model, id } of refs) {
    const row = await (prisma as any)[model].findUnique({ where: { id }, select: { timetable: true } })
    if (!row) continue
    const tt = norm(row.timetable)
    if (stripDays(tt, drop)) updates.push({ model, id, tt })
  }
  return persist(updates)
}

/** Remove every slot matching `drop` from ALL entities in a session (any type). */
export async function purgeSlotsFromSession(sessionId: string, drop: (slot: any) => boolean): Promise<number> {
  const updates: Array<{ model: string; id: string; tt: any }> = []
  for (const model of MODELS) {
    const rows = await (prisma as any)[model].findMany({ where: { sessionId }, select: { id: true, timetable: true } })
    for (const row of rows) {
      const tt = norm(row.timetable)
      if (stripDays(tt, drop)) updates.push({ model, id: row.id, tt })
    }
  }
  return persist(updates)
}
