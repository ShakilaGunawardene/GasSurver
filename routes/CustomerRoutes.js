import express from 'express';
import {
  registerCustomer,
  loginCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getNearbyGasStations,
  getCustomerProfile,
  updateCustomerProfile,
  addToFavorites,
  removeFromFavorites,
  getOrderHistory,
  getCurrentPrices
} from '../controller/CustomerController.js';
import { verifyCustomer, verifyAdmin, optionalAuth } from '../Security/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerCustomer);
router.post('/login', loginCustomer);

// Public/Optional auth routes
router.get('/gas-stations', optionalAuth, getNearbyGasStations);
router.get('/prices', getCurrentPrices);

// Protected customer routes
router.get('/profile', verifyCustomer, getCustomerProfile);
router.put('/profile', verifyCustomer, updateCustomerProfile);
router.post('/favorites', verifyCustomer, addToFavorites);
router.delete('/favorites/:stationId', verifyCustomer, removeFromFavorites);
router.get('/orders', verifyCustomer, getOrderHistory);

// Admin routes
router.get('/getAllCustomers', verifyAdmin, getAllCustomers);
router.get('/getCustomerById/:id', verifyAdmin, getCustomerById);
router.put('/updateCustomer/:id', verifyAdmin, updateCustomer);
router.delete('/deleteCustomer/:id', verifyAdmin, deleteCustomer);

export default router;
