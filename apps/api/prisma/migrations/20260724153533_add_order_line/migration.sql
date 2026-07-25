-- CreateEnum
CREATE TYPE "OrderLineType" AS ENUM ('RECIPE', 'PRODUCT');

-- CreateTable
CREATE TABLE "order_lines" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" "OrderLineType" NOT NULL,
    "recipe_id" UUID,
    "custom_input" TEXT,
    "sale_price" DECIMAL(12,2),
    "product_id" UUID,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(12,2),
    "packaging_template_id" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_packaging_template_id_fkey" FOREIGN KEY ("packaging_template_id") REFERENCES "packaging_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
