import Customer from '../schema/Customer.js';
import bcrypt from 'bcryptjs';

// Register Customer
const registerCustomer = async (req, res) => {
  const {
    customerId,
    customerName,
    customerAddress,
    customerMobileNumber,
    customerNationalId,
    email,
    password
  } = req.body;

  try {
    const exists = await Customer.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Customer already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
      customerId,
      customerName,
      customerAddress,
      customerMobileNumber,
      customerNationalId,
      email,
      password: hashedPassword
    });

    await customer.save();
    res.status(201).json({ message: 'Customer registered', customer });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get all Customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get Customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Update Customer
const updateCustomer = async (req, res) => {
  const { customerId, customerName, customerAddress, email, password } = req.body;

  try {
    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      { customerId, customerName, customerAddress, email, password },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer updated', customer: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete Customer
const deleteCustomer = async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted', customer: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

export {
  registerCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
