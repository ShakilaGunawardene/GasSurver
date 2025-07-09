const mongoose = require('mongoose');

const SalesAgent = new mongoose.Schema({
  customerId: { type: String },
  customerName: { type: String, required: true },
  customerAddress:{ type: String, required: true },
  customerMobileNumber:{type: String, required: true },
  customerNationalId:{type: String, required: true },
  customerEmail: { type: String, required: true, unique: true },
  customerPassword: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Customer', Customer);