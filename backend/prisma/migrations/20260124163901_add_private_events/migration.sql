/*
  Warnings:

  - A unique constraint covering the columns `[invite_code]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invite_link_token]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "invite_code" TEXT,
ADD COLUMN     "invite_link_token" TEXT,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'public';

-- CreateTable
CREATE TABLE "event_access" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_access_user_id_idx" ON "event_access"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_access_event_id_user_id_key" ON "event_access"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_invite_code_key" ON "events"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "events_invite_link_token_key" ON "events"("invite_link_token");

-- AddForeignKey
ALTER TABLE "event_access" ADD CONSTRAINT "event_access_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
