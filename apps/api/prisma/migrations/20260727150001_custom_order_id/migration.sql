-- Create order_sequences table for auto-incrementing daily order IDs
CREATE TABLE "order_sequences" (
    "date" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    CONSTRAINT "order_sequences_pkey" PRIMARY KEY ("date")
);

-- Drop foreign key constraints referencing orders.id
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_order_id_fkey";
ALTER TABLE "order_lines" DROP CONSTRAINT IF EXISTS "order_lines_order_id_fkey";
ALTER TABLE "shippings" DROP CONSTRAINT IF EXISTS "shippings_order_id_fkey";

-- Drop the default UUID generation for orders
-- Note: In PostgreSQL, the orders.id was UUID type. We need to change it to TEXT.
ALTER TABLE "orders" ALTER COLUMN "id" TYPE TEXT;
ALTER TABLE "orders" ALTER COLUMN "id" DROP DEFAULT;

-- Change order_id columns from UUID to TEXT to match the new orders.id type
ALTER TABLE "order_items" ALTER COLUMN "order_id" TYPE TEXT;
ALTER TABLE "order_lines" ALTER COLUMN "order_id" TYPE TEXT;
ALTER TABLE "shippings" ALTER COLUMN "order_id" TYPE TEXT;

-- Re-create foreign key constraints
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shippings" ADD CONSTRAINT "shippings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
