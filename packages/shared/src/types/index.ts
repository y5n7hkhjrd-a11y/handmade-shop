export enum UserRole {
  Admin = 'Admin',
  Staff = 'Staff',
}

export enum ProductType {
  BASE = 'BASE',
  CHARM = 'CHARM',
}

export enum OrderLineType {
  RECIPE = 'RECIPE',
  PRODUCT = 'PRODUCT',
}

export enum OrderStatus {
  Draft = 'Draft',
  WaitingConfirm = 'WaitingConfirm',
  InProgress = 'InProgress',
  Packaging = 'Packaging',
  ReadyToShip = 'ReadyToShip',
  Completed = 'Completed',
}

export enum TransactionType {
  IMPORT = 'IMPORT',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum ShippingStatus {
  Pending = 'Pending',
  Shipped = 'Shipped',
  InTransit = 'InTransit',
  Delivered = 'Delivered',
  Failed = 'Failed',
}

export enum PackagingType {
  ITEM = 'ITEM',
  ORDER = 'ORDER',
}

// User
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Customer
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Matching Rule
export interface MatchingRule {
  id: string;
  code: string;
  name: string;
  pattern: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product — defines values (cost) as components/materials (matching rule is per-recipe via RecipeProduct)
export interface Product {
  id: string;
  type: ProductType;
  name: string;
  description?: string | null;
  cost: number;
  isActive: boolean;
  trackInventory: boolean;
  createdAt: string;
  updatedAt: string;
}

// Recipe — defines the END PRODUCT FOR SELL, references Product (BASE main + CHARM additions)
export interface Recipe {
  id: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  recipeProducts?: RecipeProduct[];
}

export interface RecipeProduct {
  id: string;
  recipeId: string;
  productId: string;
  product?: Product;
  matchingRuleId?: string | null;
  matchingRule?: MatchingRule | null;
  quantity: number;
}

// Packaging
export interface PackagingTemplate {
  id: string;
  name: string;
  type: PackagingType;
  description?: string | null;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  components: PackagingComponent[];
}

export interface PackagingComponent {
  id: string;
  packagingTemplateId: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
}

// Order Line — each line in an order can be a recipe-based product or a direct product
export interface OrderLine {
  id: string;
  orderId: string;
  type: OrderLineType;
  recipeId?: string | null;
  recipe?: Recipe | null;
  customInput?: string | null;
  salePrice?: number | null;
  productId?: string | null;
  product?: Product | null;
  quantity?: number | null;
  unitPrice?: number | null;
  packagingTemplateId?: string | null;
  packagingTemplate?: PackagingTemplate | null;
  notes?: string | null;
  createdAt?: string;
}

// Order
export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  status: OrderStatus;
  orderDate: string;
  confirmedAt?: string | null;
  completedAt?: string | null;
  recipeId?: string | null;
  recipe?: Recipe | null;
  customInput?: string | null;
  subtotal: number;
  discount: number;
  paidAmount: number;
  materialCost: number;
  packagingCost: number;
  shippingCost: number;
  totalCost: number;
  salePriceSnapshot?: number | null;
  costSnapshot?: number | null;
  notes?: string | null;
  items: OrderItem[];
  orderLines: OrderLine[];
  shipping: Shipping[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  packagingTemplateId?: string | null;
  packagingCost: number;
  notes?: string | null;
}

// Inventory
export interface InventoryTransaction {
  id: string;
  type: TransactionType;
  productId?: string | null;
  componentName?: string | null;
  quantity: number;
  unit: string;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

// Cost Rule
export interface CostRule {
  id: string;
  name: string;
  productType: ProductType;
  productId?: string | null;
  formula: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Shipping
export interface Shipping {
  id: string;
  orderId: string;
  deliveryType: string;
  shippingMethod: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  status: ShippingStatus;
  eta?: string | null;
  cost: number;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

// Dashboard / Reports
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  activeOrders: number;
  lowStockItems: number;
  recentOrders: Order[];
}

export interface RevenueReport {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
