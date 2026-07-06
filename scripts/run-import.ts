/**
 * Import the real dump into a fresh session, then try to schedule all courses.
 * Run: pnpm tsx scripts/run-import.ts <path-to-json>
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'
import { POST as importPost } from '../src/app/api/import-session/route'
import { compileSchedulingData, scheduleCourses } from '../src/app/api/schedule-all/algo'

const FILE = process.argv[2] || `${process.env.HOME}/Documents/tmp/Jul-Nov-2026-2027-Odd-Semester-allocations-2026-07-06.json`

async function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))

  // Fresh target session
  const name = `IMPORT TEST ${Date.now()}`
  const session = await prisma.session.create({ data: { name } })

  // Drive the real import handler
  const req = new Request('http://local/import', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: session.id, data }),
  }) as any
  const res = await importPost(req)
  const json = await res.json()
  console.log('import:', JSON.stringify(json))
  if (!json.success) { console.error('import failed'); process.exit(1) }

  // Schedule every course, all remaining sessions
  const courses = await prisma.course.findMany({ where: { sessionId: session.id } })
  const totalSessions = courses.reduce((n, c) => n + (c.totalSessions - c.scheduledCount), 0)
  console.log(`\ncourses created: ${courses.length}, sessions to place: ${totalSessions}`)

  const compiled = await compileSchedulingData(session.id, courses.map(c => c.id))
  // participant sanity: how many courses have zero constrained entities?
  const noParticipants = compiled.courses.filter(c =>
    !c.studentIds.length && !c.facultyIds.length && !c.hallIds.length &&
    !c.studentGroupIds.length && !c.facultyGroupIds.length && !c.hallGroupIds.length).length
  console.log(`courses with a faculty attached: ${compiled.courses.filter(c => c.facultyIds.length).length}, with no participants at all: ${noParticipants}`)

  const t0 = Date.now()
  const result = await scheduleCourses(compiled, 42)
  const secs = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`\nscheduler: ${result.message}  (${secs}s)`)
  console.log(`placed: ${result.scheduledSlots?.length ?? 0} / ${totalSessions}`)
  if (!result.success) {
    console.log(`unplaced courses: ${result.failureDetails?.length}`)
    for (const f of (result.failureDetails ?? []).slice(0, 10)) {
      console.log(`  ✗ ${f.courseCode}: ${f.remainingSessions} left, ${f.lastAvailableSlots} slots free at last try`)
    }
  }

  // Validate: no faculty occupies the same day+slot twice.
  const occ = new Map<string, Set<number>>()  // key faculty|day -> occupied slot numbers
  let clashes = 0
  for (const s of result.scheduledSlots ?? []) {
    for (const fid of (s as any).facultyIds ?? []) {
      const key = `${fid}|${s.day}`
      if (!occ.has(key)) occ.set(key, new Set())
      const set = occ.get(key)!
      for (let i = s.slotNumber; i < s.slotNumber + s.slotSpan; i++) {
        if (set.has(i)) clashes++
        set.add(i)
      }
    }
  }
  console.log(clashes === 0 ? '✓ no faculty double-booked' : `✗ ${clashes} faculty clashes!`)

  // cleanup
  await prisma.session.delete({ where: { id: session.id } })
  console.log('\n(session cleaned up)')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
