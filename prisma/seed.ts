import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a sample session if none exists
  const existingSessions = await prisma.session.count()
  
  if (existingSessions === 0) {
    await prisma.session.create({
      data: {
        name: 'Spring 2025',
        details: 'Spring semester 2025'
      }
    })
    
    console.log('Created sample session: Spring 2025')
  } else {
    console.log(`Found ${existingSessions} existing sessions`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })