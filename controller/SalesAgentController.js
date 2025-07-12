const SalesAgent = require('../schema/SalesAgent');

// Create SalesAgent (Register)
const bcrypt = require('bcryptjs');

const registerSalesAgent = async (req, res) => {
  const {
    salesAgentId,
    salesAgentName,
    salesAgentGasBrandName,
    salesAgentGasType,
    salesAgentEmail,
    salesAgentPassword
  } = req.body;

  try {
    const exists = await SalesAgent.findOne({ salesAgentEmail });
    if (exists) return res.status(400).json({ message: 'SalesAgent already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(salesAgentPassword, 10);

    const salesAgent = new SalesAgent({
      salesAgentId,
      salesAgentName,
      salesAgentGasBrandName,
      salesAgentGasType,
      salesAgentEmail,
      salesAgentPassword: hashedPassword
    });

    await salesAgent.save();
    res.status(201).json({ message: 'SalesAgent registered', salesAgent });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read all SalesAgent
const getAllSalesAgent = async (req, res) => {
  try {
    const salesAgent = await SalesAgent.find();
    res.json(salesAgent);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read SalesAgent by ID
const getSalesAgentById = async (req, res) => {
  try {
    const salesAgent = await SalesAgent.findById(req.params.id);
    if (!salesAgent) return res.status(404).json({ message: 'User not found' });
    res.json(salesAgent);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Update SalesAgent
const updateSalesAgent = async (req, res) => {
  const { salesAgentId, salesAgentName, salesAgentGasBrandName, salesAgentGasType, email,password } = req.body;
  try {
    const updated = await SalesAgent.findByIdAndUpdate(
      req.params.id,
      { salesAgentId, salesAgentName, salesAgentGasBrandName, salesAgentGasType, email,password},
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Sales Agents not found' });
    res.json({ message: 'Sales Agents  updated', driver: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete SalesAgent
const deleteSalesAgent = async (req, res) => {
  try {
    const deleted = await SalesAgent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'SalesAgent not found' });
    res.json({ message: 'SalesAgent deleted', user: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

module.exports = {
  registerSalesAgent,
  getAllSalesAgent,
  getSalesAgentById,
  updateSalesAgent,
  deleteSalesAgent
};