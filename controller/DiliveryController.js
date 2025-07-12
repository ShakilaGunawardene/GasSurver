const Delivery = require('../schema/Dilivery');

// Create delivery request
const requestDelivery = async (req, res) => {
  const { deliveryId, customerId, gasCenterId, deliveryAddress, deliveryDate } = req.body;

  try {
    const newDelivery = new Delivery({
      deliveryId,
      customerId,
      gasCenterId,
      deliveryAddress,
      deliveryDate,
      paymentMethod: 'Cash on Delivery', // always COD
      deliveryStatus: 'Pending'
    });

    await newDelivery.save();
    res.status(201).json({ message: 'Delivery requested successfully', delivery: newDelivery });
  } catch (err) {
    res.status(500).json({ message: 'Error requesting delivery', error: err.message });
  }
};

// Get all deliveries
const getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find().populate('customerId').populate('gasCenterId');
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get delivery by ID
const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate('customerId').populate('gasCenterId');
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Update delivery status
const updateDeliveryStatus = async (req, res) => {
  const { deliveryStatus } = req.body;

  try {
    const updated = await Delivery.findByIdAndUpdate(
      req.params.id,
      { deliveryStatus },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Delivery not found' });
    res.json({ message: 'Delivery status updated', delivery: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete delivery
const deleteDelivery = async (req, res) => {
  try {
    const deleted = await Delivery.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Delivery not found' });
    res.json({ message: 'Delivery deleted', delivery: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

module.exports = {
  requestDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDeliveryStatus,
  deleteDelivery
};
