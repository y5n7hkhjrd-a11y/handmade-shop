import { ProductType } from '@handmade-shop/shared';
import { costRuleRepository } from '../repositories/costRuleRepository.js';
import { recipeRepository } from '../repositories/recipeRepository.js';
import { matchingRuleRepository } from '../repositories/matchingRuleRepository.js';

export interface CostBreakdown {
  materialCost: number;
  packagingCost: number;
  extraCost: number;
  totalCost: number;
}

export interface RecipeCostBreakdown {
  materialCost: number;
  items: Array<{
    productId: string;
    productName: string;
    productType: string;
    cost: number;
    quantity: number;
    matchCount?: number;
  }>;
}

function countMatchingChars(input: string, pattern: string): number {
  try {
    const regex = new RegExp(pattern, 'g');
    const matches = input.match(regex);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export const costEngineService = {
  // ─── Legacy methods (keep for backward compatibility) ───
  async calculateMaterialCost(
    productId: string,
    productType: ProductType,
    recipeId?: string | null,
  ): Promise<number> {
    if (productType === ProductType.CHARM) {
      const rules = await costRuleRepository.findByProductType(ProductType.CHARM);
      const applicableRules = rules.filter(
        (r: { productId: string | null }) => !r.productId || r.productId === productId,
      );
      const materialCost = applicableRules.reduce((sum: number, rule: { formula: any }) => {
        const formula = rule.formula as any;
        return sum + (formula.cost || 0);
      }, 0);
      return materialCost;
    }

    if (recipeId) {
      const recipe = await recipeRepository.findByIdWithProducts(recipeId);
      if (recipe) {
        const recipeProducts = (recipe as any).recipeProducts || [];
        return recipeProducts.reduce((sum: number, rp: any) => {
          return sum + Number(rp.product?.cost || 0) * rp.quantity;
        }, 0);
      }
    }

    const rules = await costRuleRepository.findByProductType(ProductType.BASE);
    return rules.reduce((sum: number, rule: { formula: any }) => {
      const formula = rule.formula as any;
      return sum + (formula.cost || 0);
    }, 0);
  },

  calculatePackagingCost(packagingCosts: number[]): number {
    return packagingCosts.reduce((sum, cost) => sum + cost, 0);
  },

  calculateTotalCost(materialCost: number, packagingCost: number, extraCost = 0): number {
    return materialCost + packagingCost + extraCost;
  },

  calculateProfit(salePrice: number, totalCost: number): number {
    return salePrice - totalCost;
  },

  async calculateFullCost(params: {
    productId: string;
    productType: ProductType;
    recipeId?: string | null;
    itemPackagingCosts?: number[];
    orderPackagingCosts?: number[];
    extraCost?: number;
  }): Promise<CostBreakdown> {
    const materialCost = await this.calculateMaterialCost(
      params.productId,
      params.productType,
      params.recipeId,
    );
    const packagingCost = this.calculatePackagingCost([
      ...(params.itemPackagingCosts || []),
      ...(params.orderPackagingCosts || []),
    ]);
    const extraCost = params.extraCost || 0;
    const totalCost = this.calculateTotalCost(materialCost, packagingCost, extraCost);
    return { materialCost, packagingCost, extraCost, totalCost };
  },

  // ─── NEW v2.1: Recipe-based cost calculation with character matching ───
  async calculateByRecipe(params: {
    recipeId: string;
    customInput: string;
  }): Promise<RecipeCostBreakdown> {
    const recipe = await recipeRepository.findByIdWithProducts(params.recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const items: RecipeCostBreakdown['items'] = [];
    let materialCost = 0;

    const recipeProducts = (recipe as any).recipeProducts || [];
    for (const rp of recipeProducts) {
      const product = rp.product;
      if (!product) continue;

      if (product.type === 'BASE') {
        const cost = Number(product.cost) * rp.quantity;
        items.push({
          productId: product.id,
          productName: product.name,
          productType: product.type,
          cost,
          quantity: rp.quantity,
        });
        materialCost += cost;
      } else if (product.type === 'CHARM') {
        // Use matching rule from RecipeProduct level (per-recipe configuration)
        let matchCount = 0;
        if (rp.matchingRuleId) {
          const matchingRule = await matchingRuleRepository.findById(rp.matchingRuleId);
          if (matchingRule && matchingRule.pattern) {
            matchCount = countMatchingChars(params.customInput, matchingRule.pattern);
          }
        }

        const costPerUnit = Number(product.cost);
        const cost = matchCount * costPerUnit * rp.quantity;

        items.push({
          productId: product.id,
          productName: product.name,
          productType: product.type,
          cost,
          quantity: rp.quantity,
          matchCount,
        });
        materialCost += cost;
      }
    }

    return { materialCost, items };
  },

  async calculateByInput(params: {
    recipeId: string;
    customInput: string;
    salePrice: number;
    packagingCost?: number;
  }): Promise<CostBreakdown & { items: RecipeCostBreakdown['items'] }> {
    const recipeResult = await this.calculateByRecipe({
      recipeId: params.recipeId,
      customInput: params.customInput,
    });

    const packagingCost = params.packagingCost || 0;
    const totalCost = recipeResult.materialCost + packagingCost;

    return {
      materialCost: recipeResult.materialCost,
      packagingCost,
      extraCost: 0,
      totalCost,
      items: recipeResult.items,
    };
  },
};
