
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  adminId: { type: String },
  adminName: { type: String, required: true },
  adminEmail: { type: String, required: true, unique: true },
  adminPassword: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);