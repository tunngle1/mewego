-- Create email auth tables if missing.
-- Defensive: adapt user_id column type to current users.id type.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  users_id_udt text;
  id_sql_type text;
BEGIN
  SELECT c.udt_name
  INTO users_id_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'users'
    AND c.column_name = 'id';

  IF users_id_udt = 'uuid' THEN
    id_sql_type := 'uuid';
  ELSE
    -- Fallback for older schemas (text/varchar/etc.)
    id_sql_type := 'text';
  END IF;

  -- email_verification_tokens
  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
      "id" %1$s PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" %1$s NOT NULL,
      "token_hash" text NOT NULL,
      "expires_at" timestamp(3) NOT NULL,
      "used_at" timestamp(3),
      "created_at" timestamp(3) NOT NULL DEFAULT now()
    );
  $f$, id_sql_type);

  EXECUTE $f$
    CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_hash_key"
      ON "email_verification_tokens"("token_hash");
  $f$;

  EXECUTE $f$
    CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_id_expires_at_idx"
      ON "email_verification_tokens"("user_id", "expires_at");
  $f$;

  -- password_reset_tokens
  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
      "id" %1$s PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" %1$s NOT NULL,
      "token_hash" text NOT NULL,
      "expires_at" timestamp(3) NOT NULL,
      "used_at" timestamp(3),
      "created_at" timestamp(3) NOT NULL DEFAULT now()
    );
  $f$, id_sql_type);

  EXECUTE $f$
    CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key"
      ON "password_reset_tokens"("token_hash");
  $f$;

  EXECUTE $f$
    CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_expires_at_idx"
      ON "password_reset_tokens"("user_id", "expires_at");
  $f$;

  -- email_logs
  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS "email_logs" (
      "id" %1$s PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" %1$s,
      "email" text NOT NULL,
      "template_key" text NOT NULL,
      "category" text NOT NULL,
      "status" text NOT NULL DEFAULT 'queued',
      "provider" text,
      "provider_message_id" text,
      "error" text,
      "metadata_json" text,
      "sent_at" timestamp(3),
      "created_at" timestamp(3) NOT NULL DEFAULT now()
    );
  $f$, id_sql_type);

  EXECUTE $f$
    CREATE INDEX IF NOT EXISTS "email_logs_user_id_created_at_idx"
      ON "email_logs"("user_id", "created_at");
  $f$;

  EXECUTE $f$
    CREATE INDEX IF NOT EXISTS "email_logs_email_created_at_idx"
      ON "email_logs"("email", "created_at");
  $f$;
END $$;

