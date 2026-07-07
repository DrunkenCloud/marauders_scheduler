/**
 * Merge-import tests.
 *  A) Real dumps: the two institution files merge into one session; faculty do NOT
 *     dedup (different UUIDs) and the combined set still schedules.
 *  B) Synthetic: two files sharing a faculty UUID -> that faculty is imported ONCE,
 *     and both files' courses attach to the same row (so the scheduler sees one).
 * Run: pnpm tsx scripts/test-merge-import.ts
 */
import fs from 'fs'
import assert from 'assert'
import { prisma } from '../src/lib/prisma'
import { POST as mergePost } from '../src/app/api/import-sessions/route'
import { compileSchedulingData, scheduleCourses } from '../src/app/api/schedule-all/algo'

const DIR = `${process.env.HOME}/Documents/tmp/`
const fileA = DIR + 'Jul-Nov-2026-2027-Odd-Semester-allocations-2026-07-06.json'
const fileB = DIR + 'Jul-Nov-2026-2027-Odd-Semester-CSE-SSN-SoE-allocations-2026-07-07.json'

async function callMerge(sessionId: string, files: any[]) {
  const req = new Request('http://local/merge', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, files }),
  }) as any
  const json = await (await mergePost(req)).json()
  assert(json.success, `merge failed: ${JSON.stringify(json)}`)
  return json
}

async function testRealMerge() {
  const A = JSON.parse(fs.readFileSync(fileA, 'utf8'))
  const B = JSON.parse(fs.readFileSync(fileB, 'utf8'))
  const session = await prisma.session.create({ data: { name: `MERGE REAL ${Date.now()}` } })

  const { stats } = await callMerge(session.id, [A, B])
  console.log('merge stats:', JSON.stringify(stats))

  // Faculty UUIDs are disjoint across the two institutions → no dedup → 45 + 9.
  assert.strictEqual(stats.faculty, A.faculty.length + B.faculty.length,
    `faculty should be ${A.faculty.length + B.faculty.length} (no cross-institution dedup), got ${stats.faculty}`)
  console.log(`✓ faculty not deduped across institutions: ${stats.faculty} rows (45 SNU + 9 SSN)`)

  // Both files' courses are present (shared-UUID courses kept separate).
  const courses = await prisma.course.findMany({ where: { sessionId: session.id }, select: { code: true } })
  const codes = new Set(courses.map(c => c.code))
  assert(codes.has('PEAI7001'), 'expected a file-A course')          // Reinforcement Learning (A only)
  assert([...codes].some(c => c.startsWith('26')), 'expected file-B 26* courses')
  console.log(`✓ ${courses.length} courses total, both files represented`)

  // The merged set still schedules with no faculty double-booked.
  const all = await prisma.course.findMany({ where: { sessionId: session.id } })
  const compiled = await compileSchedulingData(session.id, all.map(c => c.id))
  const result = await scheduleCourses(compiled, 42)
  const occ = new Map<string, Set<number>>()
  let clashes = 0
  for (const s of result.scheduledSlots ?? []) {
    for (const fid of (s as any).facultyIds ?? []) {
      const key = `${fid}|${s.day}`
      if (!occ.has(key)) occ.set(key, new Set())
      for (let i = s.slotNumber; i < s.slotNumber + s.slotSpan; i++) { if (occ.get(key)!.has(i)) clashes++; occ.get(key)!.add(i) }
    }
  }
  assert.strictEqual(clashes, 0, `${clashes} faculty clashes`)
  console.log(`✓ merged session schedules: ${result.message}, ${result.scheduledSlots?.length} slots, no faculty double-booked`)

  await prisma.session.delete({ where: { id: session.id } })
}

async function testSharedFacultyDedup() {
  // Same faculty UUID in both files (as it would be within ONE proff_choosing DB).
  const fac = 'faculty-shared-uuid'
  const mk = (courseId: string, code: string) => ({
    faculty: [{ id: fac, name: 'Dr. Shared' }],
    courses: [{ id: courseId, courseName: code, courseCode: code, courseType: 'theory', hoursPerWeek: 3 }],
    allocations: [{ id: 'al-' + code, facultyId: fac, courseId }],
  })
  const session = await prisma.session.create({ data: { name: `MERGE DEDUP ${Date.now()}` } })
  const { stats } = await callMerge(session.id, [mk('c1', 'AAA101'), mk('c2', 'BBB202')])

  assert.strictEqual(stats.faculty, 1, `shared-UUID faculty should import once, got ${stats.faculty}`)
  const facRows = await prisma.faculty.findMany({
    where: { sessionId: session.id },
    include: { coursesTaught: { select: { code: true } } },
  })
  assert.strictEqual(facRows.length, 1, 'exactly one faculty row')
  const taught = facRows[0].coursesTaught.map(c => c.code).sort()
  assert.deepStrictEqual(taught, ['AAA101', 'BBB202'], `one faculty should teach both files' courses, got ${taught}`)
  console.log(`✓ shared-UUID faculty deduped to 1 row, attached to both files' courses (${taught}) → scheduler sees the clash`)

  await prisma.session.delete({ where: { id: session.id } })
}

async function main() {
  await testSharedFacultyDedup()
  await testRealMerge()
  console.log('\n✅ MERGE IMPORT TESTS PASSED')
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1) }).finally(() => prisma.$disconnect())
