-- Ensure email auth columns exist on older DBs.
-- This migration is intentionally defensive for remote test DBs.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "email_normalized" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "password_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "auth_providers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "marketing_email_opt_in" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "marketing_email_opt_in_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "marketing_email_opt_out_at" TIMESTAMP(3);

-- Unique indexes for email auth.
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_normalized_key" ON "users"("email_normalized");

