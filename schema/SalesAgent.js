import mongoose from 'mongoose';

const SalesAgentSchema = new mongoose.Schema(
  {
    salesAgentName: { type: String, required: true },
    salesAgentGasBrandName: { 
      type: String, 
      required: true,
      enum: ['Laugfs', 'Litro']
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    registrationId: { 
      type: String, 
      required: true,
      unique: true 
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    role: {
      type: String,
      default: 'salesAgent'
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model('SalesAgent', SalesAgentSchema);
