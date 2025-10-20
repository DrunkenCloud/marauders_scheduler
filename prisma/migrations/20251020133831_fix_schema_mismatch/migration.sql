-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Student" (
    "id" TEXT NOT NULL,
    "digitalId" INTEGER NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 15,
    "endMinute" INTEGER NOT NULL DEFAULT 30,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentGroup" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 15,
    "endMinute" INTEGER NOT NULL DEFAULT 30,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentGroupMembership" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Faculty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortForm" TEXT,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 17,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyGroup" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 17,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyGroupMembership" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "facultyGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hall" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HallGroup" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "startMinute" INTEGER NOT NULL DEFAULT 10,
    "endHour" INTEGER NOT NULL DEFAULT 20,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HallGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HallGroupMembership" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "hallGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HallGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "timetable" JSONB NOT NULL,
    "classDuration" INTEGER NOT NULL DEFAULT 50,
    "sessionsPerLecture" INTEGER NOT NULL DEFAULT 1,
    "totalSessions" INTEGER NOT NULL DEFAULT 3,
    "scheduledCount" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompulsoryFacultyGroup" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "facultyGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompulsoryFacultyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompulsoryHallGroup" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "hallGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompulsoryHallGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseStudentEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseStudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseStudentGroupEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseStudentGroupEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_CompulsoryFaculty" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompulsoryFaculty_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_CompulsoryHalls" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompulsoryHalls_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_name_key" ON "public"."Session"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_digitalId_key" ON "public"."Student"("digitalId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGroup_groupName_key" ON "public"."StudentGroup"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGroupMembership_studentId_studentGroupId_key" ON "public"."StudentGroupMembership"("studentId", "studentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyGroup_groupName_key" ON "public"."FacultyGroup"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyGroupMembership_facultyId_facultyGroupId_key" ON "public"."FacultyGroupMembership"("facultyId", "facultyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "HallGroup_groupName_key" ON "public"."HallGroup"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "HallGroupMembership_hallId_hallGroupId_key" ON "public"."HallGroupMembership"("hallId", "hallGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "public"."Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CompulsoryFacultyGroup_courseId_facultyGroupId_key" ON "public"."CompulsoryFacultyGroup"("courseId", "facultyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CompulsoryHallGroup_courseId_hallGroupId_key" ON "public"."CompulsoryHallGroup"("courseId", "hallGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStudentEnrollment_courseId_studentId_key" ON "public"."CourseStudentEnrollment"("courseId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStudentGroupEnrollment_courseId_studentGroupId_key" ON "public"."CourseStudentGroupEnrollment"("courseId", "studentGroupId");

-- CreateIndex
CREATE INDEX "_CompulsoryFaculty_B_index" ON "public"."_CompulsoryFaculty"("B");

-- CreateIndex
CREATE INDEX "_CompulsoryHalls_B_index" ON "public"."_CompulsoryHalls"("B");

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentGroup" ADD CONSTRAINT "StudentGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentGroupMembership" ADD CONSTRAINT "StudentGroupMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentGroupMembership" ADD CONSTRAINT "StudentGroupMembership_studentGroupId_fkey" FOREIGN KEY ("studentGroupId") REFERENCES "public"."StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Faculty" ADD CONSTRAINT "Faculty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyGroup" ADD CONSTRAINT "FacultyGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyGroupMembership" ADD CONSTRAINT "FacultyGroupMembership_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyGroupMembership" ADD CONSTRAINT "FacultyGroupMembership_facultyGroupId_fkey" FOREIGN KEY ("facultyGroupId") REFERENCES "public"."FacultyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Hall" ADD CONSTRAINT "Hall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HallGroup" ADD CONSTRAINT "HallGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HallGroupMembership" ADD CONSTRAINT "HallGroupMembership_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "public"."Hall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HallGroupMembership" ADD CONSTRAINT "HallGroupMembership_hallGroupId_fkey" FOREIGN KEY ("hallGroupId") REFERENCES "public"."HallGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompulsoryFacultyGroup" ADD CONSTRAINT "CompulsoryFacultyGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompulsoryFacultyGroup" ADD CONSTRAINT "CompulsoryFacultyGroup_facultyGroupId_fkey" FOREIGN KEY ("facultyGroupId") REFERENCES "public"."FacultyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompulsoryHallGroup" ADD CONSTRAINT "CompulsoryHallGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompulsoryHallGroup" ADD CONSTRAINT "CompulsoryHallGroup_hallGroupId_fkey" FOREIGN KEY ("hallGroupId") REFERENCES "public"."HallGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseStudentEnrollment" ADD CONSTRAINT "CourseStudentEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseStudentEnrollment" ADD CONSTRAINT "CourseStudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseStudentGroupEnrollment" ADD CONSTRAINT "CourseStudentGroupEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseStudentGroupEnrollment" ADD CONSTRAINT "CourseStudentGroupEnrollment_studentGroupId_fkey" FOREIGN KEY ("studentGroupId") REFERENCES "public"."StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CompulsoryFaculty" ADD CONSTRAINT "_CompulsoryFaculty_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CompulsoryFaculty" ADD CONSTRAINT "_CompulsoryFaculty_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CompulsoryHalls" ADD CONSTRAINT "_CompulsoryHalls_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CompulsoryHalls" ADD CONSTRAINT "_CompulsoryHalls_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Hall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
