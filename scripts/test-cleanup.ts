/**
 * Regression tests for timetable cleanup on:
 *   #1 course deletion   — slots purged from every entity
 *   #2 group-member removal — removed student loses classes they no longer reach
 *
 * Drives the real route handlers (no HTTP server). Run: pnpm tsx scripts/test-cleanup.ts
 */
import { execSync } from 'child_process'
import assert from 'assert'
import { prisma } from '../src/lib/prisma'
import { DELETE as deleteCourse } from '../src/app/api/courses/[id]/route'
import { DELETE as removeMembers } from '../src/app/api/student-groups/[id]/members/route'

const SESSION_NAME = 'Semester 1 — 2026'

const anySlot = (tt: any, pred: (s: any) => boolean) =>
  Object.values(tt || {}).some((day: any) => Array.isArray(day) && day.some(pred))

const req = (body?: object) => new Request('http://local/x', {
  method: 'DELETE', headers: { 'content-type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
}) as any

async function reseed() {
  await prisma.session.deleteMany({ where: { name: SESSION_NAME } })
  execSync('pnpm db:seed', { stdio: 'ignore', cwd: process.cwd() })
  return (await prisma.session.findUnique({ where: { name: SESSION_NAME } }))!
}

// Count how many entities (any type) currently hold a slot for this course.
async function entitiesWithCourse(sessionId: string, courseId: string): Promise<number> {
  const models = ['student', 'faculty', 'hall', 'studentGroup', 'facultyGroup', 'hallGroup'] as const
  let n = 0
  for (const m of models) {
    const rows = await (prisma as any)[m].findMany({ where: { sessionId }, select: { timetable: true } })
    n += rows.filter((r: any) => anySlot(r.timetable, (s: any) => s.courseId === courseId)).length
  }
  return n
}

async function testCourseDelete() {
  const session = await reseed()
  // CS201 is scheduled (Mon#0, Wed#1) across faculty AR, hall LHA, groups + students.
  const cs201 = (await prisma.course.findFirst({ where: { sessionId: session.id, code: 'CS201' } }))!
  const before = await entitiesWithCourse(session.id, cs201.id)
  assert(before > 0, 'precondition: CS201 should be on several entities')

  // Remove enrollments first (the handler guards against deleting with enrollments).
  await prisma.courseStudentEnrollment.deleteMany({ where: { courseId: cs201.id } })
  await prisma.courseStudentGroupEnrollment.deleteMany({ where: { courseId: cs201.id } })

  const res = await deleteCourse(req(), { params: Promise.resolve({ id: cs201.id }) })
  const json = await res.json()
  assert(json.success, `delete failed: ${JSON.stringify(json.error)}`)

  const after = await entitiesWithCourse(session.id, cs201.id)
  assert.strictEqual(after, 0, `CS201 slots still on ${after} entities after delete`)
  console.log(`✓ #1 course delete: purged CS201 from ${before} entities → 0`)
}

async function testMemberRemoval() {
  const session = await reseed()
  const csY2A = (await prisma.studentGroup.findFirst({ where: { sessionId: session.id, groupName: 'CS-Y2-A' } }))!
  // CS201 enrolls both CS-Y2-A and CS-Y2-B; CS203 enrolls only CS-Y2-A.
  const member = (await prisma.studentGroupMembership.findFirst({
    where: { studentGroupId: csY2A.id }, include: { student: true },
  }))!.student

  const ttBefore = (await prisma.student.findUnique({ where: { id: member.id } }))!.timetable
  assert(anySlot(ttBefore, (s: any) => s.courseCode === 'CS201'), 'precondition: student has CS201')
  assert(anySlot(ttBefore, (s: any) => s.courseCode === 'CS203'), 'precondition: student has CS203')

  const res = await removeMembers(req({ studentIds: [member.id] }), { params: Promise.resolve({ id: csY2A.id }) })
  const json = await res.json()
  assert(json.success, `remove failed: ${JSON.stringify(json.error)}`)

  const ttAfter = (await prisma.student.findUnique({ where: { id: member.id } }))!.timetable
  assert(!anySlot(ttAfter, (s: any) => s.courseCode === 'CS201'), 'FAIL: removed student still has CS201')
  assert(!anySlot(ttAfter, (s: any) => s.courseCode === 'CS203'), 'FAIL: removed student still has CS203')
  console.log('✓ #2 member removal: student lost CS201 + CS203 (no longer in group)')
}

async function main() {
  await testCourseDelete()
  await testMemberRemoval()
  console.log('\n✅ CLEANUP TESTS PASSED')
}

main()
  .catch(e => { console.error('\n✗', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
