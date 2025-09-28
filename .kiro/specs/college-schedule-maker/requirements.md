# Requirements Document

## Introduction

The College Schedule Maker is a web-based application that allows administrators to manage and view timetables for students, faculty, halls, and courses within a college system. The system provides secure admin access for schedule management while supporting different user roles (students and professors) for future expansion. The application builds upon an existing Prisma database schema and implements a slot-based scheduling system with configurable session timing constraints.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to securely log into the system with admin credentials, so that I can manage college schedules without unauthorized access.

#### Acceptance Criteria

1. WHEN a user accesses the application THEN the system SHALL display a login page as the default entry point
2. WHEN an admin enters username "admin" and password "password" THEN the system SHALL authenticate and grant admin access
3. WHEN invalid credentials are entered THEN the system SHALL display an error message and remain on the login page
4. WHEN an admin is authenticated THEN the system SHALL redirect to the admin dashboard
5. IF a user is not authenticated THEN the system SHALL prevent access to any scheduling functionality

### Requirement 2

**User Story:** As an administrator, I want to configure session timing constraints, so that all timetables follow consistent time boundaries across the college.

#### Acceptance Criteria

1. WHEN creating or editing a session THEN the system SHALL allow setting start time (default 8:10) and end time (default 15:30)
2. WHEN a session timing is set THEN the system SHALL enforce these boundaries for all timetables within that session
3. WHEN displaying timetables THEN the system SHALL show time slots within the configured session boundaries
4. IF no session timing is configured THEN the system SHALL use default timing of 8:10 to 15:30

### Requirement 3

**User Story:** As an administrator, I want to view and manage student timetables with slot-based scheduling, so that I can ensure proper schedule allocation and identify conflicts.

#### Acceptance Criteria

1. WHEN viewing a student timetable THEN the system SHALL display all time slots with status indicators (0 for free, 1+ for occupied)
2. WHEN a student timetable is created THEN the system SHALL require all time slots to be filled (either free or occupied)
3. WHEN editing a student timetable THEN the system SHALL validate that no time slots are left undefined
4. WHEN a time slot is marked as occupied THEN the system SHALL store additional scheduling information (course, type, etc.)
5. IF a student has no timetable THEN the system SHALL provide functionality to create a complete timetable

### Requirement 4

**User Story:** As an administrator, I want to manage faculty, hall, and group timetables with flexible scheduling, so that I can dynamically allocate resources based on availability.

#### Acceptance Criteria

1. WHEN viewing faculty/hall/group timetables THEN the system SHALL display only occupied time slots
2. WHEN adding time slots to faculty/hall/group timetables THEN the system SHALL allow partial scheduling (not all slots required)
3. WHEN checking availability THEN the system SHALL identify free time slots for dynamic scheduling
4. WHEN editing faculty/hall/group timetables THEN the system SHALL allow adding or removing individual time slots
5. IF a faculty/hall/group has no scheduled slots THEN the system SHALL treat all time slots as available

### Requirement 5

**User Story:** As an administrator, I want to navigate between different entity types and sessions, so that I can efficiently manage schedules across the entire college system.

#### Acceptance Criteria

1. WHEN logged in as admin THEN the system SHALL provide navigation to view students, faculty, halls, courses, and groups
2. WHEN selecting an entity type THEN the system SHALL display a list of all entities of that type within the current session
3. WHEN selecting a specific entity THEN the system SHALL display its timetable in an editable format
4. WHEN switching between sessions THEN the system SHALL update all displayed data to reflect the selected session
5. IF no entities exist for a type THEN the system SHALL display an appropriate message with creation options

### Requirement 6

**User Story:** As a system administrator, I want the application to integrate with the existing Prisma database schema, so that all schedule data is properly persisted and maintains referential integrity.

#### Acceptance Criteria

1. WHEN creating or updating timetables THEN the system SHALL store data in the existing JSON timetable fields
2. WHEN accessing entity data THEN the system SHALL use the existing Prisma models (Student, Faculty, Hall, etc.)
3. WHEN managing sessions THEN the system SHALL update the Session model with timing constraints
4. WHEN displaying relationships THEN the system SHALL respect existing foreign key constraints
5. IF database operations fail THEN the system SHALL display appropriate error messages and maintain data consistency

### Requirement 7

**User Story:** As a future system user, I want the authentication system to support multiple user types, so that students and professors can access their relevant schedule information when implemented.

#### Acceptance Criteria

1. WHEN the authentication system is designed THEN it SHALL support extensible user roles (admin, student, professor)
2. WHEN implementing login functionality THEN the system SHALL use a structure that can accommodate different user types
3. WHEN hardcoding passwords THEN the system SHALL use "password" for all user types for development purposes
4. WHEN designing the user interface THEN it SHALL accommodate different permission levels for future implementation
5. IF a non-admin user type is added THEN the system SHALL be able to restrict access to admin-only functions