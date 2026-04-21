-- AlterTable
ALTER TABLE "complaints" ADD COLUMN "resolution_action" TEXT;
ALTER TABLE "complaints" ADD COLUMN "resolution_note" TEXT;
ALTER TABLE "complaints" ADD COLUMN "resolved_at" TIMESTAMP(3);
ALTER TABLE "complaints" ADD COLUMN "resolved_by_id" TEXT;

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");

-- CreateIndex
CREATE INDEX "complaints_resolved_at_idx" ON "complaints"("resolved_at");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
