/*
  Warnings:

  - You are about to drop the column `requiredCount` on the `CompulsoryFacultyGroup` table. All the data in the column will be lost.
  - You are about to drop the column `requiredCount` on the `CompulsoryHallGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."CompulsoryFacultyGroup" DROP COLUMN "requiredCount";

-- AlterTable
ALTER TABLE "public"."CompulsoryHallGroup" DROP COLUMN "requiredCount";
