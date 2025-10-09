# Group Timetables Implementation

## Overview

This implementation adds timetable support for all group types (Student Groups, Faculty Groups, and Hall Groups) in the college scheduling system. When courses are scheduled, they are automatically added to the relevant group timetables.

## Features Added

### 1. Group Timetable Viewing
- Added "View Timetable" button to all group management interfaces
- Groups can now view their consolidated timetables showing all scheduled courses
- Timetables are read-only for groups (courses are scheduled through individual entities or course management)

### 2. Automatic Group Timetable Updates
When a course is scheduled through the TimetableEditor:
- The course is automatically added to all related group timetables
- Groups are identified through course relationships:
  - `compulsoryFacultyGroups` - Faculty groups required for the course
  - `compulsoryHallGroups` - Hall groups required for the course  
  - `studentGroupEnrollments` - Student groups enrolled in the course

### 3. Database Schema
The schema already includes timetable fields for all group types:
- `StudentGroup.timetable` - JSON field storing the group's timetable
- `FacultyGroup.timetable` - JSON field storing the group's timetable
- `HallGroup.timetable` - JSON field storing the group's timetable

## How It Works

### Course Scheduling Flow
1. User schedules a course through any entity's timetable editor
2. TimetableEditor automatically populates resource IDs from course data:
   ```typescript
   slotToAdd = {
     ...editingSlot,
     facultyIds: course.compulsoryFaculties?.map(f => f.id) || [],
     hallIds: course.compulsoryHalls?.map(h => h.id) || [],
     facultyGroupIds: course.compulsoryFacultyGroups?.map(g => g.facultyGroup.id) || [],
     hallGroupIds: course.compulsoryHallGroups?.map(g => g.hallGroup.id) || [],
     studentIds: course.studentEnrollments?.map(e => e.student.id) || [],
     studentGroupIds: course.studentGroupEnrollments?.map(e => e.studentGroup.id) || []
   }
   ```
3. `updateRelatedTimetables()` function updates all related entity timetables including groups
4. Groups automatically show the scheduled course in their timetables

### Group Timetable Access
- Navigate to any group management page (Student Groups, Faculty Groups, Hall Groups)
- Click "View Timetable" button on any group
- View the consolidated timetable showing all courses scheduled for that group
- Use "Back to [Group Type] List" to return to group management

## API Support

The timetable API (`/api/timetables`) already supports all group types:
- `EntityType.STUDENT_GROUP`
- `EntityType.FACULTY_GROUP` 
- `EntityType.HALL_GROUP`

## Components Updated

### Group List Components
- `StudentGroupList.tsx` - Added timetable viewing action
- `FacultyGroupList.tsx` - Added timetable viewing action
- `HallGroupList.tsx` - Added timetable viewing action

### Group Management Components
- `StudentGroupManagement.tsx` - Added timetable view state and navigation
- `FacultyGroupManagement.tsx` - Added timetable view state and navigation
- `HallGroupManagement.tsx` - Added timetable view state and navigation

### Existing Components (No Changes Needed)
- `TimetableEditor.tsx` - Already supports group timetable updates
- `TimetableManagement.tsx` - Already supports all entity types including groups
- `/api/timetables/route.ts` - Already supports group entity types

## Usage Examples

### Viewing a Student Group Timetable
1. Go to Student Groups management
2. Find the desired student group
3. Click "View Timetable"
4. See all courses scheduled for students in that group

### Scheduling a Course with Groups
1. Go to any entity's timetable (student, faculty, hall, or course)
2. Add a new course slot
3. Select a course that has group requirements
4. The course automatically appears in all related group timetables

## Benefits

1. **Consolidated View**: Groups can see all their scheduled courses in one place
2. **Automatic Synchronization**: No manual updates needed - group timetables update automatically
3. **Consistency**: All related entities (individuals and groups) stay synchronized
4. **Flexibility**: Supports complex course requirements involving multiple groups
5. **Read-Only Safety**: Groups can't accidentally modify schedules, maintaining data integrity

## Technical Notes

- Group timetables are automatically managed and should not be manually edited
- The system maintains referential integrity between individual and group timetables
- All timetable operations are atomic to prevent inconsistencies
- The existing conflict detection system works with group timetables