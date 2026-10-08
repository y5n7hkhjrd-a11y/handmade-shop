import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Safety guard: refuse to run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to seed in production environment!');
    process.exit(1);
  }

  // ── Check if already seeded (look for admin user) ──
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`✅ Database already has ${existingUsers} users — skipping seed.`);
    return;
  }

  // ── Clear existing data (in reverse dependency order) ──
  await prisma.inventoryTransaction.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.costRule.deleteMany();
  await prisma.packagingComponent.deleteMany();
  await prisma.packagingTemplate.deleteMany();
  await prisma.recipeProduct.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.product.deleteMany();
  await prisma.matchingRule.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleared existing data');

  // ── Users ──
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@handmadeshop.com',
      password: adminPassword,
      name: 'Admin',
      role: 'Admin',
    },
  });
  const staffPasswordHash = await bcrypt.hash('staff123', 10);
  await prisma.user.create({
    data: {
      username: 'staff',
      email: 'staff@handmadeshop.com',
      password: staffPasswordHash,
      name: 'Staff User',
      role: 'Staff',
    },
  });
  console.log(`Created users (admin: ${admin.username})`);

  // ── Customers ──
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Nguyen Van A',
        phone: '0912345678',
        address: '123 Le Loi, District 1, HCMC',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Tran Thi B',
        phone: '0987654321',
        address: '456 Nguyen Hue, District 1, HCMC',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Le Van C',
        phone: '0909090909',
        address: '789 Vo Van Tan, District 3, HCMC',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Pham Thi D',
        phone: '0911111111',
        address: '321 Nguyen Trai, District 5, HCMC',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Hoang Van E',
        phone: '0922222222',
        address: '654 Le Van Sy, District 3, HCMC',
      },
    }),
  ]);
  console.log(`Created ${customers.length} customers`);

  // ── Matching Rules ──
  await prisma.matchingRule.createMany({
    data: [
      {
        code: 'ALPHANUMERIC',
        name: 'Chữ & Số',
        pattern: '[a-zA-Z0-9]',
        description: 'Tất cả chữ và số',
      },
      {
        code: 'ALPHA',
        name: 'Chỉ chữ',
        pattern: '[a-zA-Z]',
        description: 'Chữ cái in hoa và thường',
      },
      { code: 'NUMBER', name: 'Chỉ số', pattern: '[0-9]', description: 'Chữ số 0-9' },
      {
        code: 'UNDERSCORE',
        name: 'Gạch dưới (_)',
        pattern: '_',
        description: 'Charm hình đặc biệt',
      },
      { code: 'AT', name: 'Ký tự @', pattern: '@', description: 'Charm kim loại' },
      { code: 'HASH', name: 'Ký tự #', pattern: '#', description: 'Charm đặc biệt' },
      { code: 'DOT', name: 'Dấu chấm (.)', pattern: '\.', description: 'Charm chấm tròn' },
      { code: 'DASH', name: 'Dấu gạch ngang (-)', pattern: '-', description: 'Charm dấu gạch' },
    ],
  });
  const matchingRules = await prisma.matchingRule.findMany({ orderBy: { createdAt: 'asc' } });
  const alphaNumRule = matchingRules.find((r) => r.code === 'ALPHANUMERIC')!;
  const underscoreRule = matchingRules.find((r) => r.code === 'UNDERSCORE')!;
  const atRule = matchingRules.find((r) => r.code === 'AT')!;
  const hashRule = matchingRules.find((r) => r.code === 'HASH')!;
  console.log(`Created ${matchingRules.length} matching rules`);

  // ── Products (materials/components) ──
  const products = await Promise.all([
    prisma.product.create({
      data: {
        type: 'BASE',
        name: 'Phôi móc khóa',
        description: 'Khung móc khóa kim loại cơ bản',
        cost: 5000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'BASE',
        name: 'Dây da nền',
        description: 'Dây da màu đen làm nền cho vòng tay',
        cost: 8000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'BASE',
        name: 'Vòng bạc nền',
        description: 'Vòng bạc trơn làm nền',
        cost: 15000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'CHARM',
        name: 'Charm chữ',
        description: 'Charm ký tự chữ và số - mỗi ký tự là một charm',
        cost: 2000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'CHARM',
        name: 'Charm hình',
        description: 'Charm hình dạng đặc biệt (trái tim, ngôi sao...)',
        cost: 5000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'CHARM',
        name: 'Charm trái tim bạc',
        description: 'Charm hình trái tim mạ bạc cao cấp',
        cost: 8000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'CHARM',
        name: 'Charm ngôi sao vàng',
        description: 'Charm ngôi sao mạ vàng 24K',
        cost: 10000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'CHARM',
        name: 'Charm kim loại @',
        description: 'Charm kim loại đặc biệt',
        cost: 7000,
      },
    }),
    prisma.product.create({
      data: {
        type: 'CHARM',
        name: 'Charm đặc biệt #',
        description: 'Charm đặc biệt cao cấp',
        cost: 12000,
      },
    }),
  ]);
  console.log(`Created ${products.length} products`);

  // ── Recipes (end products for sell) ──
  const recipe1 = await prisma.recipe.create({
    data: {
      name: 'Móc khóa Custom',
      description: 'Móc khóa cá nhân hóa với tên và hình trang trí',
      recipeProducts: {
        create: [
          { productId: products[0]!.id, quantity: 1 },
          { productId: products[3]!.id, quantity: 1, matchingRuleId: alphaNumRule.id },
          { productId: products[4]!.id, quantity: 1, matchingRuleId: underscoreRule.id },
        ],
      },
    },
  });

  const recipe2 = await prisma.recipe.create({
    data: {
      name: 'Vòng tay Custom',
      description: 'Vòng tay cá nhân hóa với chữ và charm',
      recipeProducts: {
        create: [
          { productId: products[1]!.id, quantity: 1 },
          { productId: products[3]!.id, quantity: 2, matchingRuleId: alphaNumRule.id },
          { productId: products[5]!.id, quantity: 1, matchingRuleId: underscoreRule.id },
        ],
      },
    },
  });

  const recipe3 = await prisma.recipe.create({
    data: {
      name: 'Vòng bạc cao cấp',
      description: 'Vòng bạc với charm kim loại cao cấp',
      recipeProducts: {
        create: [
          { productId: products[2]!.id, quantity: 1 },
          { productId: products[7]!.id, quantity: 1, matchingRuleId: atRule.id },
          { productId: products[8]!.id, quantity: 1, matchingRuleId: hashRule.id },
          { productId: products[6]!.id, quantity: 1, matchingRuleId: underscoreRule.id },
        ],
      },
    },
  });

  console.log(`Created recipes: ${recipe1.name}, ${recipe2.name}, ${recipe3.name}`);

  // ── Packaging Templates ──
  await prisma.packagingTemplate.create({
    data: {
      name: 'Hộp quà tiêu chuẩn',
      type: 'ITEM',
      description: 'Hộp quà tiêu chuẩn cho từng sản phẩm',
      totalCost: 15000,
      components: {
        createMany: {
          data: [
            { name: 'Hộp quà', quantity: 1, unit: 'cái', cost: 10000 },
            { name: 'Ruy băng', quantity: 1, unit: 'mét', cost: 3000 },
            { name: 'Giấy lụa', quantity: 2, unit: 'tờ', cost: 2000 },
          ],
        },
      },
    },
  });

  await prisma.packagingTemplate.create({
    data: {
      name: 'Gói quà cao cấp',
      type: 'ORDER',
      description: 'Gói quà cao cấp cho toàn bộ đơn hàng',
      totalCost: 30000,
      components: {
        createMany: {
          data: [
            { name: 'Hộp quà cao cấp', quantity: 1, unit: 'cái', cost: 20000 },
            { name: 'Ruy băng satin', quantity: 2, unit: 'mét', cost: 6000 },
            { name: 'Thiệp cảm ơn', quantity: 1, unit: 'cái', cost: 4000 },
          ],
        },
      },
    },
  });

  await prisma.packagingTemplate.create({
    data: {
      name: 'Túi vải eco',
      type: 'ORDER',
      description: 'Túi vải thân thiện môi trường',
      totalCost: 10000,
      components: {
        createMany: {
          data: [
            { name: 'Túi vải canvas', quantity: 1, unit: 'cái', cost: 8000 },
            { name: 'Tem thương hiệu', quantity: 1, unit: 'cái', cost: 2000 },
          ],
        },
      },
    },
  });
  console.log('Created packaging templates');

  // ── Cost Rules ──
  await prisma.costRule.createMany({
    data: [
      {
        name: 'BASE Material Cost',
        productType: 'BASE',
        isActive: true,
        formula: { type: 'recipe', description: 'Tính theo công thức' },
      },
      {
        name: 'CHARM Per-Char Cost',
        productType: 'CHARM',
        isActive: true,
        formula: { cost: 0, type: 'per_char', description: 'Phí mỗi ký tự ghép được' },
      },
    ],
  });
  console.log('Created cost rules');

  // ── Orders ──
  // Generate IDs manually for seed data (avoid calling orderSequence upsert in seed)
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${yy}${mm}${dd}`;
  let seedCounter = 0;
  const nextSeedId = () => {
    seedCounter++;
    return `${today}-${String(seedCounter).padStart(3, '0')}`;
  };

  // Order 1: Draft - single recipe
  await prisma.order.create({
    data: {
      id: nextSeedId(),
      customerId: customers[0]!.id,
      status: 'Draft',
      recipeId: recipe1.id,
      customInput: 'TANDAT__',
      subtotal: 50000,
      totalCost: 50000,
      items: {
        create: [
          { productId: products[0]!.id, quantity: 1, unitPrice: 5000, totalPrice: 5000 },
          { productId: products[3]!.id, quantity: 6, unitPrice: 2000, totalPrice: 12000 },
          { productId: products[4]!.id, quantity: 2, unitPrice: 5000, totalPrice: 10000 },
        ],
      },
      orderLines: {
        create: [
          {
            type: 'RECIPE',
            recipeId: recipe1.id,
            customInput: 'TANDAT__',
            salePrice: 50000,
            quantity: 1,
          },
        ],
      },
    },
  });

  // Order 2: WaitingConfirm - single recipe
  await prisma.order.create({
    data: {
      id: nextSeedId(),
      customerId: customers[1]!.id,
      status: 'WaitingConfirm',
      recipeId: recipe2.id,
      customInput: 'HANDMADE_',
      subtotal: 80000,
      totalCost: 80000,
      items: {
        create: [
          { productId: products[1]!.id, quantity: 1, unitPrice: 8000, totalPrice: 8000 },
          { productId: products[3]!.id, quantity: 16, unitPrice: 2000, totalPrice: 32000 },
          { productId: products[5]!.id, quantity: 1, unitPrice: 8000, totalPrice: 8000 },
        ],
      },
      orderLines: {
        create: [
          {
            type: 'RECIPE',
            recipeId: recipe2.id,
            customInput: 'HANDMADE_',
            salePrice: 80000,
            quantity: 1,
          },
        ],
      },
    },
  });

  // Order 3: InProgress (confirmed - has snapshot) - multi-line
  await prisma.order.create({
    data: {
      id: nextSeedId(),
      customerId: customers[2]!.id,
      status: 'InProgress',
      confirmedAt: new Date(),
      subtotal: 210000,
      materialCost: 91000,
      packagingCost: 15000,
      shippingCost: 30000,
      totalCost: 136000,
      salePriceSnapshot: 210000,
      costSnapshot: 136000,
      items: {
        create: [
          { productId: products[0]!.id, quantity: 2, unitPrice: 5000, totalPrice: 10000 },
          { productId: products[3]!.id, quantity: 12, unitPrice: 2000, totalPrice: 24000 },
          { productId: products[4]!.id, quantity: 2, unitPrice: 5000, totalPrice: 10000 },
          { productId: products[1]!.id, quantity: 1, unitPrice: 8000, totalPrice: 8000 },
        ],
      },
      orderLines: {
        create: [
          {
            type: 'RECIPE',
            recipeId: recipe1.id,
            customInput: 'HANDMADE__',
            salePrice: 50000,
            quantity: 2,
          },
          {
            type: 'RECIPE',
            recipeId: recipe2.id,
            customInput: 'ABC_123',
            salePrice: 80000,
            quantity: 1,
          },
          { type: 'PRODUCT', productId: products[6]!.id, quantity: 3, unitPrice: 10000 },
        ],
      },
    },
  });

  // Order 4: Completed - finished order
  await prisma.order.create({
    data: {
      id: nextSeedId(),
      customerId: customers[3]!.id,
      status: 'Completed',
      confirmedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      recipeId: recipe3.id,
      customInput: '@NGOC#_',
      subtotal: 120000,
      materialCost: 47000,
      packagingCost: 10000,
      totalCost: 57000,
      salePriceSnapshot: 120000,
      costSnapshot: 57000,
      items: {
        create: [
          { productId: products[2]!.id, quantity: 1, unitPrice: 15000, totalPrice: 15000 },
          { productId: products[7]!.id, quantity: 1, unitPrice: 7000, totalPrice: 7000 },
          { productId: products[8]!.id, quantity: 1, unitPrice: 12000, totalPrice: 12000 },
          { productId: products[6]!.id, quantity: 1, unitPrice: 10000, totalPrice: 10000 },
        ],
      },
      orderLines: {
        create: [
          {
            type: 'RECIPE',
            recipeId: recipe3.id,
            customInput: '@NGOC#_',
            salePrice: 120000,
            quantity: 1,
          },
        ],
      },
    },
  });

  // ── Add shipping records for completed orders ──
  // Get the last order (Order 4: Completed)
  const lastOrder = await prisma.order.findFirstOrThrow({
    where: { customerId: customers[3]!.id, status: 'Completed' },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.shipping.create({
    data: {
      orderId: lastOrder.id,
      deliveryType: 'SPX Express',
      shippingMethod: 'SPX Express',
      carrier: 'SPX',
      trackingNumber: 'SPXVN060664065977',
      status: 'Delivered',
      cost: 30000,
      shippedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('  + Added shipping record for Order 4 (Completed)');

  console.log('Created 4 sample orders (Draft, WaitingConfirm, InProgress, Completed)');

  // ── Inventory Transactions ──
  await prisma.inventoryTransaction.createMany({
    data: [
      {
        type: 'IMPORT',
        productId: products[0]!.id,
        quantity: 100,
        unit: 'cái',
        reference: 'NK001',
        notes: 'Nhập kho ban đầu',
      },
      {
        type: 'IMPORT',
        productId: products[1]!.id,
        quantity: 50,
        unit: 'cái',
        reference: 'NK001',
        notes: 'Nhập kho ban đầu',
      },
      {
        type: 'IMPORT',
        productId: products[2]!.id,
        quantity: 30,
        unit: 'cái',
        reference: 'NK001',
        notes: 'Nhập kho ban đầu',
      },
      {
        type: 'IMPORT',
        productId: products[3]!.id,
        quantity: 500,
        unit: 'cái',
        reference: 'NK002',
        notes: 'Nhập charm từ NCC A',
      },
      {
        type: 'IMPORT',
        productId: products[4]!.id,
        quantity: 200,
        unit: 'cái',
        reference: 'NK002',
        notes: 'Nhập charm từ NCC A',
      },
      {
        type: 'IMPORT',
        productId: products[5]!.id,
        quantity: 100,
        unit: 'cái',
        reference: 'NK003',
        notes: 'Nhập charm bạc',
      },
      {
        type: 'IMPORT',
        productId: products[6]!.id,
        quantity: 80,
        unit: 'cái',
        reference: 'NK003',
        notes: 'Nhập charm vàng',
      },
      {
        type: 'IMPORT',
        productId: products[7]!.id,
        quantity: 150,
        unit: 'cái',
        reference: 'NK004',
        notes: 'Nhập charm kim loại',
      },
      {
        type: 'IMPORT',
        productId: products[8]!.id,
        quantity: 60,
        unit: 'cái',
        reference: 'NK004',
        notes: 'Nhập charm đặc biệt',
      },
      {
        type: 'SALE',
        productId: products[0]!.id,
        quantity: 3,
        unit: 'cái',
        reference: 'Bán hàng',
        notes: 'Bán qua đơn hàng',
      },
      {
        type: 'SALE',
        productId: products[3]!.id,
        quantity: 34,
        unit: 'cái',
        reference: 'Bán hàng',
        notes: 'Bán qua đơn hàng',
      },
      {
        type: 'SALE',
        productId: products[4]!.id,
        quantity: 4,
        unit: 'cái',
        reference: 'Bán hàng',
        notes: 'Bán qua đơn hàng',
      },
      {
        type: 'ADJUSTMENT',
        productId: products[3]!.id,
        quantity: -5,
        unit: 'cái',
        reference: 'Điều chỉnh',
        notes: 'Hao hụt tồn kho',
      },
    ],
  });
  console.log('Created inventory transactions');

  console.log('\n✅ Seed completed successfully!');
  console.log('━'.repeat(40));
  console.log('🔑 Admin login: admin / admin123');
  console.log('🔑 Staff login: staff / staff123');
  console.log('📊 5 customers, 9 products, 3 recipes, 3 packaging templates');
  console.log('📦 4 sample orders across different statuses');
  console.log('📈 8 matching rules, 2 cost rules, 13 inventory transactions');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
