import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('🔍 Kiểm tra orders có paidAmount bất thường...\n');

  const orders = await prisma.order.findMany({
    where: { deletedAt: null, paidAmount: { gt: 0 } },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Tổng số orders có paidAmount > 0: ${orders.length}\n`);

  let affectedCount = 0;

  for (const order of orders) {
    const paid = Number(order.paidAmount);
    const subtotal = Number(order.subtotal || 0);
    const packaging = Number(order.packagingCost || 0);
    const discount = Number(order.discount || 0);
    const salePriceTotal = subtotal - discount + packaging;

    // Case 1: paidAmount > total (giá giảm sau khi thanh toán)
    if (paid > salePriceTotal && salePriceTotal > 0) {
      affectedCount++;
      console.log(`❌ [${order.id}] ${order.customer?.name || 'N/A'}`);
      console.log(`   Đã thanh toán: ${paid.toLocaleString('vi-VN')}₫`);
      console.log(`   Tổng hiện tại: ${salePriceTotal.toLocaleString('vi-VN')}₫`);
      console.log(`   Chênh lệch:    ${(paid - salePriceTotal).toLocaleString('vi-VN')}₫ (trả thừa)\n`);
    }

    // Case 2: paidAmount > 0 but total is now 0 (order was emptied?)
    if (paid > 0 && salePriceTotal === 0) {
      affectedCount++;
      console.log(`⚠️  [${order.id}] ${order.customer?.name || 'N/A'}`);
      console.log(`   Đã thanh toán: ${paid.toLocaleString('vi-VN')}₫`);
      console.log(`   Tổng hiện tại: 0₫ (đơn đã bị xoá hết SP?)\n`);
    }

    // Case 3: paidAmount equals snapshot - might be old confirmed orders (this is OK)
    // Skip orders that have confirmedAt and paidAmount matches snapshot
    if (order.confirmedAt && order.salePriceSnapshot) {
      const snapshot = Number(order.salePriceSnapshot);
      if (paid === snapshot) {
        // This is a confirmed order with snapshot matching paidAmount - normal
        continue;
      }
    }
  }

  if (affectedCount === 0) {
    console.log('✅ Không tìm thấy order nào có paidAmount bất thường!');
  } else {
    console.log(`\n📊 Tổng cộng: ${affectedCount} orders cần xử lý.`);
    console.log('👉 Để reset paidAmount về 0 cho các order này, chạy: pnpm db:fix-reset-payment');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
