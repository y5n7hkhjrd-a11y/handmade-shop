import { z } from 'zod';
import {
  UserRole,
  ProductType,
  OrderStatus,
  TransactionType,
  ShippingStatus,
  PackagingType,
} from '../types/index.js';

// Auth
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole).default(UserRole.Staff),
});

// Customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// Matching Rule
export const createMatchingRuleSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required'),
  pattern: z.string().min(1, 'Pattern is required'),
  description: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const updateMatchingRuleSchema = createMatchingRuleSchema.partial();

// Product — defines values (cost) as component/material
// matchingRuleId is now per-recipe on RecipeProduct
export const createProductSchema = z.object({
  type: z.nativeEnum(ProductType),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
  cost: z.number().min(0, 'Cost must be non-negative').default(0),
  isActive: z.boolean().default(true),
  trackInventory: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

// Recipe — end product for sell (references Product only: BASE main + CHARM additions)
export const recipeProductLinkSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  matchingRuleId: z.string().uuid().optional().or(z.literal('')),
});

export const createRecipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  recipeProducts: z.array(recipeProductLinkSchema).default([]),
});

export const updateRecipeSchema = createRecipeSchema.partial();

// Packaging
export const packagingComponentSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  cost: z.number().min(0),
});

export const createPackagingTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum(PackagingType),
  description: z.string().optional().or(z.literal('')),
  components: z.array(packagingComponentSchema).default([]),
});

export const updatePackagingTemplateSchema = createPackagingTemplateSchema.partial();

// Order — OrderLine: each line is either RECIPE or PRODUCT type
export const createOrderLineSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('RECIPE'),
    recipeId: z.string().uuid('Recipe ID is required'),
    customInput: z.string().min(1, 'Custom input is required'),
    salePrice: z.number().positive('Vui lòng nhập giá bán cho dòng công thức'),
    quantity: z.number().int().min(1).default(1),
    notes: z.string().optional().or(z.literal('')),
  }),
  z.object({
    type: z.literal('PRODUCT'),
    productId: z.string().uuid('Product ID is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
    unitPrice: z.number().min(0, 'Unit price must be non-negative').default(0),
    packagingTemplateId: z.string().uuid().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  }),
]);

export const createOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0),
  packagingTemplateId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export const createOrderSchema = z
  .object({
    customerId: z.string().uuid(),
    notes: z.string().optional().or(z.literal('')),
    // New multi-line format
    orderLines: z.array(createOrderLineSchema).optional(),
    // Legacy fields (backward compatibility)
    recipeId: z.string().uuid().optional(),
    customInput: z.string().optional(),
    salePrice: z.number().min(0).optional(),
    items: z.array(createOrderItemSchema).default([]),
  })
  .refine(
    (data) =>
      data.orderLines || data.items.length > 0 || (data.recipeId && data.customInput !== undefined),
    {
      message: 'Either orderLines, items, or recipeId + customInput must be provided',
    },
  );

export const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional().or(z.literal('')),
});

// Inventory
export const createInventoryTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  productId: z.string().uuid().optional().or(z.literal('')),
  componentName: z.string().optional().or(z.literal('')),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
  unit: z.string().default('unit'),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

// Cost Rule
export const createCostRuleSchema = z.object({
  name: z.string().min(1),
  productType: z.nativeEnum(ProductType),
  productId: z.string().uuid().optional().or(z.literal('')),
  formula: z.record(z.unknown()),
  isActive: z.boolean().default(true),
});

export const updateCostRuleSchema = createCostRuleSchema.partial();

// Shipping
export const createShippingSchema = z.object({
  orderId: z.string().uuid(),
  deliveryType: z.string().min(1),
  shippingMethod: z.string().min(1),
  carrier: z.string().optional().or(z.literal('')),
  trackingNumber: z.string().optional().or(z.literal('')),
  eta: z.string().datetime().optional().or(z.literal('')),
  cost: z.number().min(0).default(0),
});

export const updateShippingSchema = z.object({
  status: z.nativeEnum(ShippingStatus).optional(),
  trackingNumber: z.string().optional().or(z.literal('')),
  carrier: z.string().optional().or(z.literal('')),
  eta: z.string().datetime().optional().or(z.literal('')),
  shippedAt: z.string().datetime().optional().or(z.literal('')),
  deliveredAt: z.string().datetime().optional().or(z.literal('')),
  cost: z.number().min(0).optional(),
});

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Date range filter
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateMatchingRuleInput = z.infer<typeof createMatchingRuleSchema>;
export type UpdateMatchingRuleInput = z.infer<typeof updateMatchingRuleSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type CreatePackagingTemplateInput = z.infer<typeof createPackagingTemplateSchema>;
export type UpdatePackagingTemplateInput = z.infer<typeof updatePackagingTemplateSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateRecipeOrderInput = z.infer<typeof createOrderSchema> & {
  recipeId: string;
  customInput: string;
  salePrice: number;
};
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateInventoryTransactionInput = z.infer<typeof createInventoryTransactionSchema>;
export type CreateCostRuleInput = z.infer<typeof createCostRuleSchema>;
export type UpdateCostRuleInput = z.infer<typeof updateCostRuleSchema>;
export type CreateShippingInput = z.infer<typeof createShippingSchema>;
export type UpdateShippingInput = z.infer<typeof updateShippingSchema>;
