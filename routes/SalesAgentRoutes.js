import express from 'express';
import { protect } from '../Security/VerifyToken.js';
import { verifyAdmin, verifySalesAgent } from '../Security/authMiddleware.js';
import {
  registerSalesAgent,
  getAllSalesAgent,
  getSalesAgentById,
  getAgentProfile,
  updateSalesAgent,
  deleteSalesAgent,
  getAssignedShops,
  updateShopStock,
  getShopStock,
  getStockHistory,
  bulkUpdateStock,
  createShop,
  getShopOrders,
  updateOrderStatus,
  confirmOrder,
  rejectOrder,
  scheduleNextArrival,
  cancelNextArrival,
  getArrivalsSchedule,
  triggerArrivalsNow
} from '../controller/SalesAgentController.js';

const router = express.Router();
// Routes - Public registration for self-signup, then admin approval required
router.post('/register', registerSalesAgent);
router.get('/getAllSalesAgent', protect(['admin']), getAllSalesAgent);
router.get('/getSalesAgentById/:id', getSalesAgentById);
router.get('/profile', verifySalesAgent, getAgentProfile);
router.put('/updateSalesAgent/:id', updateSalesAgent);
router.delete('/deleteSalesAgent/:id', deleteSalesAgent);

// Shop Management Routes
router.get('/shops', verifySalesAgent, getAssignedShops);
router.post('/shops/create', verifySalesAgent, createShop);
router.get('/shop/:shopId/stock', verifySalesAgent, getShopStock);
router.put('/shop/:shopId/stock', verifySalesAgent, updateShopStock);
router.get('/shop/:shopId/stock-history', verifySalesAgent, getStockHistory);
router.put('/shop/:shopId/bulk-update', verifySalesAgent, bulkUpdateStock);

// Order Management Routes
router.get('/shop/:shopId/orders', verifySalesAgent, getShopOrders);
router.put('/order/:orderId/status', verifySalesAgent, updateOrderStatus);
router.post('/order/:orderId/confirm', verifySalesAgent, confirmOrder);
router.post('/order/:orderId/reject', verifySalesAgent, rejectOrder);

// Next Arrival Management Routes
router.post('/shop/:shopId/next-arrival', verifySalesAgent, scheduleNextArrival);
router.delete('/shop/:shopId/next-arrival', verifySalesAgent, cancelNextArrival);
router.get('/shop/:shopId/arrivals', verifySalesAgent, getArrivalsSchedule);
router.post('/trigger-arrivals', verifySalesAgent, triggerArrivalsNow);

export default router;
