-- Migration: Migrate shipping_paid_by from 'customer'/'shop' to 'prepaid'/'cod'/'shop'
-- The field now uses 3 options: 'prepaid', 'cod', 'shop'

-- Update existing records: 'customer' → 'prepaid'
UPDATE "orders" SET "shipping_paid_by" = 'prepaid' WHERE "shipping_paid_by" = 'customer';

-- Update column default to match new Prisma schema default
ALTER TABLE "orders" ALTER COLUMN "shipping_paid_by" SET DEFAULT 'prepaid';
