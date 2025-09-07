import express from 'express';
import {
  createOrder,
  getOrderById,
  getCustomerOrders,
  updateOrderStatus,
  rateOrder,
  trackOrder,
  getOrderSummary
} from '../controller/OrderController.js';
import { verifyCustomer, optionalAuth } from '../Security/authMiddleware.js';

const router = express.Router();

// Protected customer routes
router.post('/create', verifyCustomer, createOrder);
router.get('/my-orders', verifyCustomer, getCustomerOrders);
router.get('/summary', verifyCustomer, getOrderSummary);
router.get('/:orderId', verifyCustomer, getOrderById);
router.put('/:orderId/status', verifyCustomer, updateOrderStatus);
router.post('/:orderId/rate', verifyCustomer, rateOrder);

// Public/Optional auth routes (for order tracking)
router.get('/track/:orderNumber', optionalAuth, trackOrder);

export default router;