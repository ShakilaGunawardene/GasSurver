import mongoose from 'mongoose';

const DeliverySchema = new mongoose.Schema(
  {
    
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    gasCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'GasStock', required: true },
    deliveryAddress: { type: String, required: true },
    deliveryDate: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ['Cash on Delivery'],
      default: 'Cash on Delivery'
    },
    deliveryStatus: {
      type: String,
      enum: ['Pending', 'Out for delivery', 'Delivered', 'Cancelled'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Delivery', DeliverySchema);