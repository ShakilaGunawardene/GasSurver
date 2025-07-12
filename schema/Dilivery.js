const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  deliveryId: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  gasCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'GasStock', required: true },
  deliveryAddress: { type: String, required: true },
  deliveryDate: { type: Date, required: true },
  paymentMethod: { type: String, enum: ['Cash on Delivery'], default: 'Cash on Delivery' },
  deliveryStatus: { type: String, enum: ['Pending', 'Out for delivery', 'Delivered', 'Cancelled'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', DeliverySchema);
