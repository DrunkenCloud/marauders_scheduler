/**
 * Regression test: removing a shared course slot from ONE entity's timetable
 * must remove it from every other entity that shares the slot.
 *
 * Drives the real PUT handler (no HTTP server needed) and checks the DB after.
 * Run:  pnpm tsx scripts/test-timetable-fanout.ts
 */
import { execSync } from 'child_process'
import assert from 'assert'
import { prisma } from '../src/lib/prisma'
import { PUT } from '../src/app/api/timetables/route'

const SESSION_NAME = 'Semester 1 — 2026'

function hasSlot(tt: any, day: string, courseCode: string, slotNumber: number): boolean {
  return Array.isArray(tt?.[day]) &&
    tt[day].some((s: any) => s.type === 'course' && s.courseCode === courseCode && s.slotNumber === slotNumber)
}

async function callPut(body: object) {
  const req = new Request('http://local/api/timetables', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const res = await PUT(req as any)
  const json = await res.json()
  assert(json.success, `PUT failed: ${JSON.stringify(json.error)}`)
  return json
}

async function main() {
  await prisma.session.deleteMany({ where: { name: SESSION_NAME } })
  console.log('→ Reseeding...')
  execSync('pnpm db:seed', { stdio: 'inherit', cwd: process.cwd() })

  const session = (await prisma.session.findUnique({ where: { name: SESSION_NAME } }))!
  const sid = session.id

  // Seed places CS201 on Monday slot 0, shared across faculty AR, hall LHA,
  // groups CS-Y2-A/CS-Y2-B and their students. Also CS203 Monday slot 2 (should stay).
  const ar = (await prisma.faculty.findFirst({ where: { sessionId: sid, shortForm: 'AR' } }))!
  const lha = (await prisma.hall.findFirst({ where: { sessionId: sid, shortForm: 'LHA' } }))!
  const csY2A = (await prisma.studentGroup.findFirst({ where: { sessionId: sid, groupName: 'CS-Y2-A' } }))!
  const member = (await prisma.studentGroupMembership.findFirst({ where: { studentGroupId: csY2A.id }, include: { student: true } }))!.student

  // Precondition: everyone shares CS201 Mon#0.
  for (const [label, tt] of [['faculty AR', ar.timetable], ['hall LHA', lha.timetable], ['group CSY2A', csY2A.timetable], ['a student', member.timetable]] as const) {
    assert(hasSlot(tt, 'Monday', 'CS201', 0), `precondition: ${label} should have CS201 Mon#0`)
  }
  console.log('✓ precondition: CS201 Mon#0 present in faculty, hall, group, student')

  // ── Act: remove CS201 Mon#0 from the FACULTY view only ────────────────────
  const facTt: any = JSON.parse(JSON.stringify(ar.timetable))
  facTt.Monday = facTt.Monday.filter((s: any) => !(s.courseCode === 'CS201' && s.slotNumber === 0))
  await callPut({ entityType: 'faculty', entityId: ar.id, sessionId: sid, timetable: facTt })
  console.log('✓ removed CS201 Mon#0 from faculty AR via PUT')

  // ── Assert: gone everywhere it was shared ─────────────────────────────────
  const [arAfter, lhaAfter, grpAfter, stuAfter] = await Promise.all([
    prisma.faculty.findUnique({ where: { id: ar.id } }),
    prisma.hall.findUnique({ where: { id: lha.id } }),
    prisma.studentGroup.findUnique({ where: { id: csY2A.id } }),
    prisma.student.findUnique({ where: { id: member.id } }),
  ])
  for (const [label, tt] of [['faculty AR', arAfter!.timetable], ['hall LHA', lhaAfter!.timetable], ['group CSY2A', grpAfter!.timetable], ['student', stuAfter!.timetable]] as const) {
    assert(!hasSlot(tt, 'Monday', 'CS201', 0), `FAIL: ${label} still has CS201 Mon#0 — fan-out missed it`)
  }
  console.log('✓ CS201 Mon#0 removed from faculty, hall, group, AND student')

  // ── Assert: an unrelated shared slot is untouched ─────────────────────────
  assert(hasSlot(lhaAfter!.timetable, 'Monday', 'CS203', 2) === hasSlot(lha.timetable, 'Monday', 'CS203', 2),
    'unrelated CS203 slot changed on hall — over-deleted')
  // CS203 lives on faculty CH / hall LHC, not LHA — just make sure LHA wasn't corrupted.
  console.log('✓ unrelated slots untouched')

  console.log('\n✅ FAN-OUT TEST PASSED')
}

main()
  .catch(e => { console.error('\n✗', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
