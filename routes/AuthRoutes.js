import express from 'express';
import { 
  login, 
  getPendingSalesAgents, 
  approveSalesAgent, 
  rejectSalesAgent, 
  getAllSalesAgents 
} from '../controller/AuthController.js';
import { verifyAdmin } from '../Security/authMiddleware.js';

const router = express.Router();

router.post('/login', login);

// Admin routes for sales agent approval
router.get('/admin/pending-agents', verifyAdmin, getPendingSalesAgents);
router.get('/admin/sales-agents', verifyAdmin, getAllSalesAgents);
router.patch('/admin/approve-agent/:agentId', verifyAdmin, approveSalesAgent);
router.patch('/admin/reject-agent/:agentId', verifyAdmin, rejectSalesAgent);

export default router;
