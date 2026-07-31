-- Add driver info fields for Grab carrier support
ALTER TABLE "shippings" ADD COLUMN "driver_name" TEXT;
ALTER TABLE "shippings" ADD COLUMN "driver_phone" TEXT;
