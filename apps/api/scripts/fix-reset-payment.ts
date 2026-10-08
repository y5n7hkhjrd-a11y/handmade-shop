import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('🔧 RESET PAIDAMOUNT CHO ORDERS BỊ SAI\n');

  const orders = await prisma.order.findMany({
    where: { deletedAt: null, paidAmount: { gt: 0 } },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  let fixed = 0;
  let skipped = 0;

  for (const order of orders) {
    const paid = Number(order.paidAmount);
    const subtotal = Number(order.subtotal || 0);
    const packaging = Number(order.packagingCost || 0);
    const discount = Number(order.discount || 0);
    const salePriceTotal = subtotal - discount + packaging;

    // Only reset if paidAmount > total (overpaid due to price reduction after payment)
    // Skip confirmed orders where paidAmount matches snapshot (these are correct)
    if (order.confirmedAt && order.salePriceSnapshot) {
      const snapshot = Number(order.salePriceSnapshot);
      if (paid === snapshot) {
        skipped++;
        continue;
      }
    }

    if (paid > salePriceTotal && salePriceTotal > 0) {
      console.log(`❌ ${order.id} — ${order.customer?.name || 'N/A'}`);
      console.log(`   paidAmount: ${paid.toLocaleString('vi-VN')}₫ → 0₫`);
      console.log(`   Tổng hiện tại: ${salePriceTotal.toLocaleString('vi-VN')}₫`);

      await prisma.order.update({
        where: { id: order.id },
        data: { paidAmount: 0 },
      });

      fixed++;
    }
  }

  console.log(`\n📊 Kết quả:`);
  console.log(`   • Đã reset: ${fixed} orders`);
  console.log(`   • Giữ nguyên: ${skipped} orders (đã confirm + có snapshot khớp)`);

  if (fixed > 0) {
    console.log(`\n✅ Done! User có thể thanh toán lại với giá mới.`);
  } else {
    console.log(`\n✅ Không có order nào cần fix.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
