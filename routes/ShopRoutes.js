import express from 'express';
import {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  assignSalesAgent,
  getNearbyShops,
  updateShopStatus
} from '../controller/ShopController.js';
import { verifyAdmin, verifyToken } from '../Security/authMiddleware.js';

const router = express.Router();

router.post('/create', verifyAdmin, createShop);

router.get('/all', getAllShops);

router.get('/nearby', getNearbyShops);

router.get('/:id', getShopById);

router.put('/update/:id', verifyAdmin, updateShop);

router.patch('/status/:id', verifyAdmin, updateShopStatus);

router.post('/assign-agent', verifyAdmin, assignSalesAgent);

router.delete('/delete/:id', verifyAdmin, deleteShop);

export default router;