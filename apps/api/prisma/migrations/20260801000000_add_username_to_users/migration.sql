-- Add username column to users
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill existing users with username derived from email prefix
UPDATE "users" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL;

-- Make username NOT NULL and unique
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Make email optional
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
