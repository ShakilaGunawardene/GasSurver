import express from 'express';
import { protect } from '../Security/VerifyToken.js';
import {
  registerSalesAgent,
  getAllSalesAgent,
  getSalesAgentById,
  updateSalesAgent,
  deleteSalesAgent
} from '../controller/SalesAgentController.js';

const router = express.Router();
// Routes
router.post('/register', protect(['admin']), registerSalesAgent);
router.get('/getAllSalesAgent', protect(['admin']), getAllSalesAgent);
router.get('/getSalesAgentById/:id', getSalesAgentById);
router.put('/updateSalesAgent/:id', updateSalesAgent);
router.delete('/deleteSalesAgent/:id', deleteSalesAgent);

export default router;
