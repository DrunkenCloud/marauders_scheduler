-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digitalId" INTEGER NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 15,
    "endMinute" INTEGER NOT NULL DEFAULT 30,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupName" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 15,
    "endMinute" INTEGER NOT NULL DEFAULT 30,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentGroupMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "studentGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentGroupMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentGroupMembership_studentGroupId_fkey" FOREIGN KEY ("studentGroupId") REFERENCES "StudentGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortForm" TEXT,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 17,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Faculty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FacultyGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupName" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 17,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FacultyGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FacultyGroupMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facultyId" TEXT NOT NULL,
    "facultyGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FacultyGroupMembership_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FacultyGroupMembership_facultyGroupId_fkey" FOREIGN KEY ("facultyGroupId") REFERENCES "FacultyGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "Floor" TEXT NOT NULL,
    "Building" TEXT NOT NULL,
    "shortForm" TEXT,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 20,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HallGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupName" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 20,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HallGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HallGroupMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hallId" TEXT NOT NULL,
    "hallGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HallGroupMembership_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HallGroupMembership_hallGroupId_fkey" FOREIGN KEY ("hallGroupId") REFERENCES "HallGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "classDuration" INTEGER NOT NULL DEFAULT 50,
    "sessionsPerLecture" INTEGER NOT NULL DEFAULT 1,
    "totalSessions" INTEGER NOT NULL DEFAULT 3,
    "scheduledCount" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompulsoryFacultyGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "facultyGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompulsoryFacultyGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompulsoryFacultyGroup_facultyGroupId_fkey" FOREIGN KEY ("facultyGroupId") REFERENCES "FacultyGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompulsoryHallGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "hallGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompulsoryHallGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompulsoryHallGroup_hallGroupId_fkey" FOREIGN KEY ("hallGroupId") REFERENCES "HallGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseStudentEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseStudentEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseStudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseStudentGroupEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "studentGroupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseStudentGroupEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseStudentGroupEnrollment_studentGroupId_fkey" FOREIGN KEY ("studentGroupId") REFERENCES "StudentGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CompulsoryFaculty" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CompulsoryFaculty_A_fkey" FOREIGN KEY ("A") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CompulsoryFaculty_B_fkey" FOREIGN KEY ("B") REFERENCES "Faculty" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CompulsoryHalls" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CompulsoryHalls_A_fkey" FOREIGN KEY ("A") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CompulsoryHalls_B_fkey" FOREIGN KEY ("B") REFERENCES "Hall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_name_key" ON "Session"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_digitalId_key" ON "Student"("digitalId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGroup_groupName_key" ON "StudentGroup"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGroupMembership_studentId_studentGroupId_key" ON "StudentGroupMembership"("studentId", "studentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyGroup_groupName_key" ON "FacultyGroup"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyGroupMembership_facultyId_facultyGroupId_key" ON "FacultyGroupMembership"("facultyId", "facultyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "HallGroup_groupName_key" ON "HallGroup"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "HallGroupMembership_hallId_hallGroupId_key" ON "HallGroupMembership"("hallId", "hallGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CompulsoryFacultyGroup_courseId_facultyGroupId_key" ON "CompulsoryFacultyGroup"("courseId", "facultyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CompulsoryHallGroup_courseId_hallGroupId_key" ON "CompulsoryHallGroup"("courseId", "hallGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStudentEnrollment_courseId_studentId_key" ON "CourseStudentEnrollment"("courseId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStudentGroupEnrollment_courseId_studentGroupId_key" ON "CourseStudentGroupEnrollment"("courseId", "studentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "_CompulsoryFaculty_AB_unique" ON "_CompulsoryFaculty"("A", "B");

-- CreateIndex
CREATE INDEX "_CompulsoryFaculty_B_index" ON "_CompulsoryFaculty"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CompulsoryHalls_AB_unique" ON "_CompulsoryHalls"("A", "B");

-- CreateIndex
CREATE INDEX "_CompulsoryHalls_B_index" ON "_CompulsoryHalls"("B");
