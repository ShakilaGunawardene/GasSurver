import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerAddress: { type: String, required: true },
    customerMobileNumber: { type: String, required: true },
    customerNationalId: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      default: 'customer'
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    preferences: {
      preferredGasBrand: { type: String, enum: ['Shell', 'Laugfs', 'IOC'], default: 'Shell' },
      preferredGasType: { type: String, default: 'LP Gas 12.5kg' },
      maxDeliveryDistance: { type: Number, default: 10 }
    },
    favoriteStations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GasStock'
    }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('Customer', CustomerSchema);

