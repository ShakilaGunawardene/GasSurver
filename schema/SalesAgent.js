const mongoose = require('mongoose');

const SalesAgent = new mongoose.Schema({
  salesAgentId: { type: String },
  salesAgentName: { type: String, required: true },
  salesAgentGasBrandName:{ type: String, required: true },
  salesAgentGasType:{type: String, required: true },
  salesAgentEmail: { type: String, required: true, unique: true },
  salesAgentPassword: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SalesAgent', SalesAgent);