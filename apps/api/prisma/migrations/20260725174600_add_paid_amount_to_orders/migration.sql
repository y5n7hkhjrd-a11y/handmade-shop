-- AlterTable: add paid_amount column to orders
ALTER TABLE "orders" ADD COLUMN "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
