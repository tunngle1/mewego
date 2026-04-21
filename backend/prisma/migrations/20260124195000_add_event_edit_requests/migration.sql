-- CreateTable
CREATE TABLE "event_edit_requests" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "before_snapshot" TEXT NOT NULL,
    "after_snapshot" TEXT NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_edit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_edit_requests_event_id_idx" ON "event_edit_requests"("event_id");

-- CreateIndex
CREATE INDEX "event_edit_requests_organizer_id_idx" ON "event_edit_requests"("organizer_id");

-- CreateIndex
CREATE INDEX "event_edit_requests_status_idx" ON "event_edit_requests"("status");
