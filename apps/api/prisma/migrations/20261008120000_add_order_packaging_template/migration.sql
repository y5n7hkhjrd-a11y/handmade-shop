-- Tách mẫu đóng gói CẢ ĐƠN (ORDER) ra cột riêng trên bảng orders.
-- Trước đây nó bị lưu đè lên packaging_template_id của dòng đầu tiên,
-- xung đột với mẫu đóng gói ITEM của dòng đó.
ALTER TABLE "orders" ADD COLUMN "order_packaging_template_id" UUID;

-- Backfill: đơn cũ có mẫu ORDER đang nằm trên dòng đầu tiên
UPDATE "orders" o
SET "order_packaging_template_id" = ol."packaging_template_id"
FROM "order_lines" ol
WHERE ol."order_id" = o."id"
  AND ol."packaging_template_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "packaging_templates" pt
    WHERE pt."id" = ol."packaging_template_id" AND pt."type" = 'ORDER'
  );

-- Gỡ mẫu ORDER khỏi ô packaging_template_id của các dòng (không xóa cả dòng)
UPDATE "order_lines" ol
SET "packaging_template_id" = NULL
FROM "packaging_templates" pt
WHERE ol."packaging_template_id" = pt."id" AND pt."type" = 'ORDER';

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_packaging_template_id_fkey"
  FOREIGN KEY ("order_packaging_template_id") REFERENCES "packaging_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
