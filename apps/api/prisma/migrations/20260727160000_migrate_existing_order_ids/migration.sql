-- Update existing UUID-format order IDs to the new YYMMDD-XXX format
-- ON UPDATE CASCADE on child table FKs will automatically update references
-- Offsets the counter by the max existing YYMMDD sequence per day to avoid PK collision

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Build new IDs for UUID orders, offsetting by any existing YYMMDD counters per day
  CREATE TEMP TABLE order_id_map AS
  WITH existing_counters AS (
    SELECT 
      SPLIT_PART(id, '-', 1) AS day_key,
      MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)) AS max_seq
    FROM orders
    WHERE "deletedAt" IS NULL
      AND id ~ '^\d{6}-\d{3}$'
    GROUP BY SPLIT_PART(id, '-', 1)
  )
  SELECT 
    o.id AS old_id,
    TO_CHAR(o.order_date::date, 'YYMMDD') || '-' || LPAD(
      (
        ROW_NUMBER() OVER (
          PARTITION BY o.order_date::date 
          ORDER BY o.order_date, o.id
        ) + COALESCE(ec.max_seq, 0)
      )::text,
      3, '0'
    ) AS new_id
  FROM orders o
  LEFT JOIN existing_counters ec 
    ON ec.day_key = TO_CHAR(o.order_date::date, 'YYMMDD')
  WHERE o."deletedAt" IS NULL
    AND o.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Orders to migrate: %', updated_count;

  -- Update orders.id — ON UPDATE CASCADE handles child tables (order_items, order_lines, shippings)
  UPDATE orders o
  SET id = m.new_id
  FROM order_id_map m
  WHERE o.id = m.old_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Orders updated: %', updated_count;

  -- Sync the order_sequences table with max counter per day
  INSERT INTO order_sequences ("date", "counter")
  SELECT 
    TO_CHAR(order_date::date, 'YYMMDD'),
    COUNT(*)
  FROM orders
  WHERE "deletedAt" IS NULL
  GROUP BY order_date::date
  ON CONFLICT ("date") DO UPDATE 
    SET counter = GREATEST(order_sequences.counter, EXCLUDED.counter);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Order sequence counters synced: %', updated_count;

  DROP TABLE order_id_map;
END $$;
