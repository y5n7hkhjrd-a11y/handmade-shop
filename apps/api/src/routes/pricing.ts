import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { paginationSchema } from '@handmade-shop/shared';

export const pricingRouter: Router = Router();

// GET /pricing — List all products with calculated cost info
pricingRouter.get(
  '/',
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as any;
      const type = req.query.type as string | undefined;
      const search = req.query.search as string | undefined;

      const where: any = { deletedAt: null };
      if (type) where.type = type;
      if (search) where.name = { contains: search, mode: 'insensitive' };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.product.count({ where }),
      ]);

      // Fetch packaging templates for cost reference
      const packagingTemplates = await prisma.packagingTemplate.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, type: true, totalCost: true },
        orderBy: { name: 'asc' },
      });

      // For each product, calculate cost breakdown
      const data = products.map((product) => {
        const baseCost = Number(product.cost);

        // Find applicable packaging templates
        const itemPackaging = packagingTemplates.filter((p) => p.type === 'ITEM');
        const orderPackaging = packagingTemplates.filter((p) => p.type === 'ORDER');

        return {
          id: product.id,
          type: product.type,
          name: product.name,
          description: product.description,
          baseCost,
          isActive: product.isActive,
          trackInventory: product.trackInventory,
          // Cost breakdown
          costBreakdown: {
            baseCost,
            availablePackaging: {
              item: itemPackaging.map((p) => ({ id: p.id, name: p.name, cost: Number(p.totalCost) })),
              order: orderPackaging.map((p) => ({ id: p.id, name: p.name, cost: Number(p.totalCost) })),
            },
          },
        };
      });

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /pricing/:id — Detailed cost breakdown for a single product
pricingRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        recipeOf: {
          include: {
            recipe: {
              select: { id: true, name: true, description: true },
            },
            matchingRule: {
              select: { id: true, code: true, name: true, pattern: true },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const baseCost = Number(product.cost);

    // Fetch all packaging templates
    const packagingTemplates = await prisma.packagingTemplate.findMany({
      where: { deletedAt: null },
      include: { components: true },
      orderBy: { name: 'asc' },
    });

    // For recipe-based pricing, calculate potential costs
    const recipePricing = product.recipeOf.map((rp) => {
      const quantity = rp.quantity;
      const matchRule = rp.matchingRule;
      const charCost = product.type === 'CHARM' ? baseCost : 0;

      return {
        recipeId: rp.recipe.id,
        recipeName: rp.recipe.name,
        recipeDescription: rp.recipe.description,
        quantity,
        matchingRule: matchRule
          ? { id: matchRule.id, code: matchRule.code, name: matchRule.name, pattern: matchRule.pattern }
          : null,
        // Estimated cost per unit of this product when used in the recipe
        estimatedCost: baseCost * quantity,
        charCostPerMatch: charCost,
      };
    });

    // Packaging cost summary
    const packagingSummary = {
      item: packagingTemplates
        .filter((p) => p.type === 'ITEM')
        .map((p) => ({
          id: p.id,
          name: p.name,
          totalCost: Number(p.totalCost),
          components: p.components.map((c) => ({
            name: c.name,
            quantity: Number(c.quantity),
            unit: c.unit,
            cost: Number(c.cost),
          })),
        })),
      order: packagingTemplates
        .filter((p) => p.type === 'ORDER')
        .map((p) => ({
          id: p.id,
          name: p.name,
          totalCost: Number(p.totalCost),
          components: p.components.map((c) => ({
            name: c.name,
            quantity: Number(c.quantity),
            unit: c.unit,
            cost: Number(c.cost),
          })),
        })),
    };

    res.json({
      success: true,
      data: {
        id: product.id,
        type: product.type,
        name: product.name,
        description: product.description,
        baseCost,
        isActive: product.isActive,
        trackInventory: product.trackInventory,
        recipePricing,
        packagingSummary,
      },
    });
  } catch (error) {
    next(error);
  }
});
