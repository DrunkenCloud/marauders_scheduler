/*
  Warnings:

  - You are about to drop the column `endHour` on the `Faculty` table. All the data in the column will be lost.
  - You are about to drop the column `endMinute` on the `Faculty` table. All the data in the column will be lost.
  - You are about to drop the column `startHour` on the `Faculty` table. All the data in the column will be lost.
  - You are about to drop the column `startMinute` on the `Faculty` table. All the data in the column will be lost.
  - You are about to drop the column `endHour` on the `FacultyGroup` table. All the data in the column will be lost.
  - You are about to drop the column `endMinute` on the `FacultyGroup` table. All the data in the column will be lost.
  - You are about to drop the column `startHour` on the `FacultyGroup` table. All the data in the column will be lost.
  - You are about to drop the column `startMinute` on the `FacultyGroup` table. All the data in the column will be lost.
  - You are about to drop the column `endHour` on the `Hall` table. All the data in the column will be lost.
  - You are about to drop the column `endMinute` on the `Hall` table. All the data in the column will be lost.
  - You are about to drop the column `startHour` on the `Hall` table. All the data in the column will be lost.
  - You are about to drop the column `startMinute` on the `Hall` table. All the data in the column will be lost.
  - You are about to drop the column `endHour` on the `HallGroup` table. All the data in the column will be lost.
  - You are about to drop the column `endMinute` on the `HallGroup` table. All the data in the column will be lost.
  - You are about to drop the column `startHour` on the `HallGroup` table. All the data in the column will be lost.
  - You are about to drop the column `startMinute` on the `HallGroup` table. All the data in the column will be lost.
  - You are about to drop the column `endHour` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `endMinute` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `startHour` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `startMinute` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `endHour` on the `StudentGroup` table. All the data in the column will be lost.
  - You are about to drop the column `endMinute` on the `StudentGroup` table. All the data in the column will be lost.
  - You are about to drop the column `startHour` on the `StudentGroup` table. All the data in the column will be lost.
  - You are about to drop the column `startMinute` on the `StudentGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Faculty" DROP COLUMN "endHour",
DROP COLUMN "endMinute",
DROP COLUMN "startHour",
DROP COLUMN "startMinute";

-- AlterTable
ALTER TABLE "FacultyGroup" DROP COLUMN "endHour",
DROP COLUMN "endMinute",
DROP COLUMN "startHour",
DROP COLUMN "startMinute";

-- AlterTable
ALTER TABLE "Hall" DROP COLUMN "endHour",
DROP COLUMN "endMinute",
DROP COLUMN "startHour",
DROP COLUMN "startMinute";

-- AlterTable
ALTER TABLE "HallGroup" DROP COLUMN "endHour",
DROP COLUMN "endMinute",
DROP COLUMN "startHour",
DROP COLUMN "startMinute";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "endHour",
DROP COLUMN "endMinute",
DROP COLUMN "startHour",
DROP COLUMN "startMinute";

-- AlterTable
ALTER TABLE "StudentGroup" DROP COLUMN "endHour",
DROP COLUMN "endMinute",
DROP COLUMN "startHour",
DROP COLUMN "startMinute";
