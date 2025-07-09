const Customer = require('../schema/Customer');

// Create Customer (Register)
const registerCustomer = async (req, res) => {
  const { customerId, customerName, customerAddress, customerMobileNumber, customerNationalId, customerEmail, customerPassword } = req.body;
  try {
    const exists = await Customer.findOne({ customerEmail });
    if (exists) return res.status(400).json({ message: 'Customer already exists' });

    const customer = new Customer({ customerId, customerName, customerAddress, customerMobileNumber, customerNationalId, customerEmail, customerPassword });
    await customer.save();
    res.status(201).json({ message: 'Customer registered', customer });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read all Customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read Customer by ID
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
  const { customerId, customerName, customerAddress, customerEmail, customerPassword } = req.body;
  try {
    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      { customerId, customerName, customerAddress, customerEmail, customerPassword },
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

module.exports = {
  registerCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
