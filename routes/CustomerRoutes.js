import express from 'express';
import {
  registerCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} from '../controller/CustomerController.js';

const router = express.Router();

// Routes:
router.post('/register', registerCustomer);
router.get('/getAllCustomers', getAllCustomers);
router.get('/getCustomerById/:id', getCustomerById);
router.put('/updateCustomer/:id', updateCustomer);
router.delete('/deleteCustomer/:id', deleteCustomer);

export default router;
