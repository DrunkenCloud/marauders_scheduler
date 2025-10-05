/*
  Warnings:

  - Added the required column `requiredCount` to the `CompulsoryHallGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."CompulsoryHallGroup" ADD COLUMN     "requiredCount" INTEGER NOT NULL;
