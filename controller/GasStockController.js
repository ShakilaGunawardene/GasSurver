const GasStock = require('../schema/GasStock');

// Register new gas center
const registerGasStock = async (req, res) => {
  const { gasCenterId, gasCenterName, gasBrand, gasType, gasAvailableQty, nextArrivalDate, location } = req.body;
  try {
    const newStock = new GasStock({
      gasCenterId,
      gasCenterName,
      gasBrand,
      gasType,
      gasAvailableQty,
      nextArrivalDate,
      location
    });
    await newStock.save();
    res.status(201).json({ message: 'Gas center registered', gasStock: newStock });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get all gas centers
const getAllGasStocks = async (req, res) => {
  try {
    const stocks = await GasStock.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get gas center by ID
const getGasStockById = async (req, res) => {
  try {
    const stock = await GasStock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Gas center not found' });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Update gas center
const updateGasStock = async (req, res) => {
  const { gasCenterId, gasCenterName, gasBrand, gasType, gasAvailableQty, nextArrivalDate, location } = req.body;
  try {
    const updated = await GasStock.findByIdAndUpdate(
      req.params.id,
      { gasCenterId, gasCenterName, gasBrand, gasType, gasAvailableQty, nextArrivalDate, location },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Gas center not found' });
    res.json({ message: 'Gas center updated', gasStock: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete gas center
const deleteGasStock = async (req, res) => {
  try {
    const deleted = await GasStock.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Gas center not found' });
    res.json({ message: 'Gas center deleted', gasStock: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

module.exports = {
  registerGasStock,
  getAllGasStocks,
  getGasStockById,
  updateGasStock,
  deleteGasStock
};
