import express from 'express';
import { verifyAdmin } from '../Security/authMiddleware.js';
import {
  registerAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getSalesReport,
  getSystemStats,
  getOrderTrends,
  getCustomerAnalytics,
  getAgentPerformance
} from '../controller/AdminController.js';

const router = express.Router();

router.post('/register', registerAdmin);
router.get('/getAllAdmins', verifyAdmin, getAllAdmins);
router.get('/getAdminById/:id', verifyAdmin, getAdminById);
router.put('/updateAdmin/:id', verifyAdmin, updateAdmin);
router.delete('/deleteAdmin/:id', verifyAdmin, deleteAdmin);

// Analytics and reporting routes (Admin only)
router.get('/sales-report', verifyAdmin, getSalesReport);
router.get('/system-stats', verifyAdmin, getSystemStats);
router.get('/order-trends', verifyAdmin, getOrderTrends);
router.get('/customer-analytics', verifyAdmin, getCustomerAnalytics);
router.get('/agent-performance', verifyAdmin, getAgentPerformance);

export default router;
