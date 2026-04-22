-- Add check-in fields for event attendance confirmation (QR / manual code)
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "check_in_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "check_in_code" TEXT,
  ADD COLUMN IF NOT EXISTS "check_in_issued_at" TIMESTAMP(3);

