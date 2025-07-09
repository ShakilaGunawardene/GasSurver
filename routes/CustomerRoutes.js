const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} = require("../controller/CustomerController");

// Routes:
router.post('/register', registerCustomer);
router.get('/getAllCustomers', getAllCustomers);
router.get('/getCustomerById/:id', getCustomerById);
router.put('/updateCustomer/:id', updateCustomer);
router.delete('/deleteCustomer/:id', deleteCustomer);

module.exports = router;
