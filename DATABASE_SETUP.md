# Database Setup and Seeding

## Overview

This project uses PostgreSQL with Prisma ORM and UUID-based primary keys for all tables.

## Database Schema Changes

All tables now use UUID primary keys instead of auto-incrementing integers:
- More scalable and distributed-system friendly
- Better security (non-predictable IDs)
- Suitable for microservices architecture

## Seed Data

The seed script creates a complete test dataset:

### Created Entities:
- **1 Session**: "Spring 2025"
- **60 Students**: Digital IDs 2025001-2025060
- **1 Student Group**: "All Students Group" (contains all 60 students)
- **6 Faculty Members**: Dr. Alice Johnson, Prof. Bob Smith, etc.
- **5 Halls**: Various lecture halls and computer labs
- **8 Courses**:
  - 6 single-session courses (1 session per lecture, 50 min each)
  - 2 multi-session courses (3 sessions per lecture, 50 min each)

### Course Assignments:
- **Faculty**: Each course assigned to one faculty member
- **Halls**: 
  - Single-session courses: 1 hall each (5 halls used, last hall reused)
  - Multi-session courses: 2 halls each
- **Students**: All courses enrolled via the student group

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Database
Make sure your PostgreSQL database is running and the `DATABASE_URL` is set in your `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/scheduler_db"
```

### 3. Generate Prisma Client
```bash
pnpm run db:generate
```

### 4. Push Schema to Database
```bash
pnpm run db:push
```

### 5. Run Seed Script
```bash
pnpm run db:seed
```

## Seed Script Details

The seed script (`prisma/seed.ts`):

1. **Drops all existing data** (in correct order to handle foreign keys)
2. **Creates session** with proper metadata
3. **Creates 60 students** with realistic digital IDs
4. **Creates student group** and adds all students
5. **Creates 6 faculty members** with names and short forms
6. **Creates 5 halls** with building/floor information
7. **Creates 8 courses** with proper scheduling parameters
8. **Sets up relationships**:
   - Course ↔ Faculty assignments
   - Course ↔ Hall assignments  
   - Course ↔ Student Group enrollments

## Course Structure

### Single-Session Courses (6 courses):
- **Duration**: 50 minutes per session
- **Sessions per lecture**: 1
- **Total sessions per week**: 3
- **Faculty**: 1 per course
- **Halls**: 1 per course

### Multi-Session Courses (2 courses):
- **Duration**: 50 minutes per session
- **Sessions per lecture**: 3 (consecutive)
- **Total sessions per week**: 3
- **Faculty**: 1 per course
- **Halls**: 2 per course

## Testing the Scheduler

After seeding, you can test the scheduling algorithm with:
- All 8 courses available for scheduling
- 60 students enrolled in all courses
- Proper faculty and hall assignments
- Realistic time constraints

## Database Management

### View Data
```bash
pnpm run db:studio
```

### Reset and Re-seed
```bash
pnpm run db:push  # Reset schema
pnpm run db:seed  # Re-populate data
```

### Migration (for production)
```bash
pnpm run db:migrate
```

## Notes

- All entities have empty timetables initially (ready for scheduling)
- Working hours are set realistically:
  - Students: 8:10 AM - 3:30 PM
  - Faculty: 8:10 AM - 5:00 PM  
  - Halls: 8:10 AM - 8:00 PM
- The seed data is designed to test various scheduling scenarios
- UUIDs ensure no conflicts in distributed environments