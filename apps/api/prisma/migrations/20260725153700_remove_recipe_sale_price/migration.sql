-- Drop sale_price column from recipes (price is now defined at order creation)
ALTER TABLE "recipes" DROP COLUMN "sale_price";
