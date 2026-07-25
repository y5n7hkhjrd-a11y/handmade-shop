import express, { type Express } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { customerRouter } from './routes/customers.js';
import { productRouter } from './routes/products.js';
import { orderRouter } from './routes/orders.js';
import { inventoryRouter } from './routes/inventory.js';
import { recipeRouter } from './routes/recipes.js';
import { packagingRouter } from './routes/packaging.js';
import { costRuleRouter } from './routes/costRules.js';
import { matchingRuleRouter } from './routes/matchingRules.js';
import { shippingRouter } from './routes/shipping.js';
import { reportRouter } from './routes/reports.js';
import { dashboardRouter } from './routes/dashboard.js';
import { pricingRouter } from './routes/pricing.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';

const app: Express = express();
const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Handmade Shop API is running' });
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes (all require authentication)
app.use('/api/customers', authenticate, customerRouter);
app.use('/api/products', authenticate, productRouter);
app.use('/api/orders', authenticate, orderRouter);
app.use('/api/inventory', authenticate, inventoryRouter);
app.use('/api/recipes', authenticate, recipeRouter);
app.use('/api/packaging', authenticate, packagingRouter);
app.use('/api/cost-rules', authenticate, costRuleRouter);
app.use('/api/matching-rules', authenticate, matchingRuleRouter);
app.use('/api/shipping', authenticate, shippingRouter);
app.use('/api/reports', authenticate, reportRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/pricing', authenticate, pricingRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Handmade Shop API running on port ${PORT}`);
});

export default app;
