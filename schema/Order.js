import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { 
      type: String, 
      unique: true,
      default: function() {
        return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
      }
    },
    customerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Customer', 
      required: true 
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop'
    },
    gasStockId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'GasStock'
    },
    orderDetails: {
      gasType: { type: String, required: true },
      gasBrand: { type: String, required: true },
      quantity: { type: Number, required: true, default: 1 },
      unitPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true }
    },
    deliveryInfo: {
      deliveryAddress: { type: String, required: true },
      contactNumber: { type: String, required: true },
      preferredDeliveryDate: { type: Date, required: true },
      deliveryInstructions: { type: String }
    },
    paymentInfo: {
      paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Online Payment', 'Bank Transfer'],
        default: 'Cash on Delivery'
      },
      paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
      },
      transactionId: { type: String },
      paymentCompletedAt: { type: Date }
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
      default: 'Pending'
    },
    statusHistory: [{
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      updatedBy: { type: String },
      notes: { type: String }
    }],
    assignedDelivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery'
    },
    customerRating: {
      rating: { type: Number, min: 1, max: 5 },
      review: { type: String },
      ratedAt: { type: Date }
    },
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
    cancellationReason: { type: String },
    refundAmount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Pre-save middleware to add status to history
OrderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
      updatedBy: 'system',
      notes: `Order status updated to ${this.orderStatus}`
    });
  }
  next();
});

// Index for faster queries
OrderSchema.index({ customerId: 1, orderStatus: 1 });
OrderSchema.index({ shopId: 1, orderStatus: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ shopId: 1, createdAt: -1 });

export default mongoose.model('Order', OrderSchema);