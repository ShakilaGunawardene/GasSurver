const mongoose = require('mongoose');

const Customer = new mongoose.Schema({
  customerId: { type: String },
  customerName: { type: String, required: true },
  customerAddress:{ type: String, required: true },
  customerMobileNumber:{type: String, required: true },
  customerNationalId:{type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

role: {
    type: String,
    default: 'customer'
  }
}, { timestamps: true });

module.exports = mongoose.model('Customer', Customer);