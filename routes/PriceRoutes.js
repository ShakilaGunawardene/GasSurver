import express from 'express';
import { 
  getAllPrices,
  getPriceById,
  createPrice,
  updatePrice,
  deletePrice,
  getCurrentPrices,
  initializeDefaultPrices
} from '../controller/PriceController.js';
import { verifyAdmin } from '../Security/authMiddleware.js';

const router = express.Router();

// Public routes for customers
router.get('/current', getCurrentPrices);

// Admin-only routes
router.get('/all', verifyAdmin, getAllPrices);
router.get('/:id', verifyAdmin, getPriceById);
router.post('/create', verifyAdmin, createPrice);
router.put('/update/:id', verifyAdmin, updatePrice);
router.delete('/delete/:id', verifyAdmin, deletePrice);
router.post('/initialize', verifyAdmin, initializeDefaultPrices);

export default router;