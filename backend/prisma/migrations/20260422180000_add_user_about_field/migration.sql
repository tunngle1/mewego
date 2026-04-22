-- Add "about" field for user profile editing
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "about" TEXT;

