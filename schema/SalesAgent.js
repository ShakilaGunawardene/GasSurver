import mongoose from 'mongoose';

const SalesAgentSchema = new mongoose.Schema(
  {
    salesAgentId: { type: String },
    salesAgentName: { type: String, required: true },
    salesAgentGasBrandName: { type: String, required: true },
    salesAgentGasType: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      default: 'salesAgent'
    }
  },
  { timestamps: true }
);

export default mongoose.model('SalesAgent', SalesAgentSchema);
