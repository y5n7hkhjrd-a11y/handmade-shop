'use client';

import FlaticonIcon from '@/components/FlaticonIcon';

export interface MatchingRule {
  id: string;
  code: string;
  name: string;
  pattern: string;
}

export interface RecipeProduct {
  id: string;
  productId: string;
  quantity: number;
  matchingRuleId?: string | null;
  product: { id: string; name: string; type: string; cost: number };
}

export interface Product {
  id: string;
  name: string;
  type: string;
  cost: number;
  isActive?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  recipeProducts?: RecipeProduct[];
}

export function ProductTypeBadge({ type }: { type: string }) {
  if (type === 'BASE') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-mint-50 text-mint-700">
        <FlaticonIcon name="square" size="xs" /> Nền tảng
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-50 text-pink-700">
      <FlaticonIcon name="stars" size="xs" /> Bổ sung
    </span>
  );
}
