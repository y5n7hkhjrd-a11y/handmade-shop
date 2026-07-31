/**
 * Data fix script: Cập nhật trạng thái đơn hàng theo rule hiện tại.
 *
 * Rule:
 * - Đơn hàng ở trạng thái "ReadyToShip" hoặc "Completed" PHẢI có shipping record.
 * - Nếu chưa có shipping → roll back về "Packaging" (Đơn đã gói).
 *
 * Chạy: npx tsx apps/api/scripts/fix-order-statuses.ts
 */
import { PrismaClient, type OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

const ADVANCE_STATUSES: OrderStatus[] = ['ReadyToShip', 'Completed'];
const ROLLBACK_STATUS: OrderStatus = 'Packaging';

async function main() {
  console.log('🔍 Checking order statuses...\n');

  // Find orders at ReadyToShip or Completed
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: { in: ADVANCE_STATUSES },
    },
    include: {
      shipping: {
        where: { deletedAt: null },
        take: 1,
      },
    },
  });

  console.log(`📦 Found ${orders.length} orders at ReadyToShip/Completed:\n`);

  let fixed = 0;
  let skipped = 0;

  for (const order of orders) {
    const hasShipping = order.shipping.length > 0;

    if (!hasShipping) {
      // No shipping → roll back to Packaging
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: ROLLBACK_STATUS,
          sentAt: null,
          completedAt: null,
        },
      });
      console.log(
        `  🔄 ${order.id} (${order.status}) → ${ROLLBACK_STATUS} — không có đơn giao hàng`,
      );
      fixed++;
    } else if (order.status === 'Completed') {
      // Check if shipping is actually Delivered
      const shipping = order.shipping[0]!;
      if (shipping.status !== 'Delivered') {
        // Shipping exists but not delivered → roll back to ReadyToShip
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'ReadyToShip',
            completedAt: null,
          },
        });
        console.log(
          `  🔄 ${order.id} (Completed → ReadyToShip) — đơn giao chưa giao thành công (${shipping.status})`,
        );
        fixed++;
      } else {
        console.log(`  ✅ ${order.id} — Completed (đã giao thành công)`);
        skipped++;
      }
    } else {
      // ReadyToShip with shipping — check shipping status
      const shipping = order.shipping[0]!;
      if (shipping.status === 'Pending') {
        // Shipping is still Pending → shouldn't be at ReadyToShip
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'Packaging',
            sentAt: null,
          },
        });
        console.log(
          `  🔄 ${order.id} (ReadyToShip → Packaging) — đơn giao chưa lấy hàng (${shipping.status})`,
        );
        fixed++;
      } else {
        console.log(`  ✅ ${order.id} — ReadyToShip (đã gửi: ${shipping.status})`);
        skipped++;
      }
    }
  }

  console.log(`\n📊 Kết quả:`);
  console.log(`  - Đã sửa: ${fixed} đơn`);
  console.log(`  - Bỏ qua: ${skipped} đơn (đã đúng rule)`);
  console.log(`\n✅ Hoàn thành!`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Lỗi:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
