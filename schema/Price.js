import mongoose from 'mongoose';

const PriceSchema = new mongoose.Schema(
  {
    gasBrand: { 
      type: String, 
      required: true, 
      enum: ['Laugfs', 'Litro'] 
    },
    gasType: { 
      type: String, 
      required: true,
      enum: ['2.3kg', '5kg', '12.5kg']
    },
    basePrice: { 
      type: Number, 
      required: true 
    },
    currentPrice: { 
      type: Number, 
      required: true 
    },
    discountPercentage: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 50
    },
    priceHistory: [{
      price: { type: Number, required: true },
      effectiveDate: { type: Date, required: true },
      reason: { type: String },
      updatedBy: { type: String }
    }],
    regionalPricing: [{
      region: { type: String, required: true },
      priceMultiplier: { type: Number, default: 1 },
      deliveryCharge: { type: Number, default: 0 }
    }],
    bulkDiscounts: [{
      minQuantity: { type: Number, required: true },
      discountPercentage: { type: Number, required: true }
    }],
    isActive: { 
      type: Boolean, 
      default: true 
    },
    effectiveFrom: { 
      type: Date, 
      default: Date.now 
    },
    effectiveUntil: { 
      type: Date 
    },
    priceType: {
      type: String,
      enum: ['Standard', 'Promotional', 'Emergency', 'Bulk'],
      default: 'Standard'
    },
    lastUpdatedBy: { 
      type: String,
      default: 'system'
    }
  },
  { timestamps: true }
);

// Pre-save middleware to track price changes
PriceSchema.pre('save', function(next) {
  if (this.isModified('currentPrice')) {
    this.priceHistory.push({
      price: this.currentPrice,
      effectiveDate: new Date(),
      reason: 'Price update',
      updatedBy: this.lastUpdatedBy || 'system'
    });
  }
  next();
});

// Index for faster queries
PriceSchema.index({ gasBrand: 1, gasType: 1 });
PriceSchema.index({ isActive: 1 });
PriceSchema.index({ effectiveFrom: 1, effectiveUntil: 1 });

// Static method to get current price for a gas type
PriceSchema.statics.getCurrentPrice = function(gasBrand, gasType, region = null, quantity = 1) {
  return this.findOne({
    gasBrand,
    gasType,
    isActive: true,
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: { $gte: new Date() } }
    ]
  }).then(priceDoc => {
    if (!priceDoc) return null;
    
    let finalPrice = priceDoc.currentPrice;
    
    // Apply regional pricing
    if (region && priceDoc.regionalPricing) {
      const regionPricing = priceDoc.regionalPricing.find(r => r.region === region);
      if (regionPricing) {
        finalPrice *= regionPricing.priceMultiplier;
        finalPrice += regionPricing.deliveryCharge;
      }
    }
    
    // Apply bulk discounts
    if (quantity > 1 && priceDoc.bulkDiscounts) {
      const applicableDiscount = priceDoc.bulkDiscounts
        .filter(bulk => quantity >= bulk.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity)[0];
      
      if (applicableDiscount) {
        finalPrice *= (1 - applicableDiscount.discountPercentage / 100);
      }
    }
    
    // Apply general discount
    if (priceDoc.discountPercentage > 0) {
      finalPrice *= (1 - priceDoc.discountPercentage / 100);
    }
    
    return {
      basePrice: priceDoc.basePrice,
      currentPrice: priceDoc.currentPrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discountApplied: priceDoc.discountPercentage,
      priceType: priceDoc.priceType
    };
  });
};

export default mongoose.model('Price', PriceSchema);