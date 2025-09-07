import mongoose from 'mongoose';

const GasTypeSchema = new mongoose.Schema({
  brandName: {
    type: String,
    enum: ['Laugfs', 'Litro'],
    required: true
  },
  gasType: {
    type: String,
    enum: ['Small', 'Medium', 'Large'],
    required: true
  },
  gasSize: {
    type: String,
    enum: ['2.3kg', '5kg', '12.5kg'],
    required: true
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStockLevel: {
    type: Number,
    default: 100,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  specialPrice: {
    type: Number,
    default: null
  },
  lastRestockDate: {
    type: Date,
    default: null
  },
  nextArrival: {
    arrivalDate: {
      type: Date,
      default: null
    },
    expectedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    autoUpdateEnabled: {
      type: Boolean,
      default: false
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesAgent'
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled', 'completed'],
      default: 'scheduled'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  supplier: {
    name: { type: String },
    contact: { type: String }
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const ShopStockSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    gasStocks: [GasTypeSchema],
    totalValue: {
      type: Number,
      default: 0
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'updatedByRole'
    },
    updatedByRole: {
      type: String,
      enum: ['SalesAgent', 'Admin'],
      default: 'SalesAgent'
    },
    stockAlerts: [{
      gasType: String,
      brandName: String,
      alertType: {
        type: String,
        enum: ['low_stock', 'out_of_stock', 'overstocked']
      },
      message: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      isResolved: {
        type: Boolean,
        default: false
      }
    }],
    stockHistory: [{
      action: {
        type: String,
        enum: ['restock', 'sale', 'adjustment', 'return', 'damage']
      },
      brandName: String,
      gasType: String,
      quantity: Number,
      previousQuantity: Number,
      newQuantity: Number,
      reason: String,
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'stockHistory.performedByRole'
      },
      performedByRole: {
        type: String,
        enum: ['SalesAgent', 'Admin', 'Customer']
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    notes: {
      type: String,
      default: ''
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

ShopStockSchema.index({ shopId: 1 });
ShopStockSchema.index({ 'gasStocks.brandName': 1 });
ShopStockSchema.index({ 'gasStocks.gasType': 1 });
ShopStockSchema.index({ 'gasStocks.availableQuantity': 1 });

ShopStockSchema.pre('save', function(next) {
  this.totalValue = this.gasStocks.reduce((total, stock) => {
    return total + (stock.availableQuantity * stock.unitPrice);
  }, 0);
  
  this.stockAlerts = [];
  this.gasStocks.forEach(stock => {
    if (stock.availableQuantity === 0 && stock.isAvailable) {
      this.stockAlerts.push({
        gasType: stock.gasType,
        brandName: stock.brandName,
        alertType: 'out_of_stock',
        message: `${stock.brandName} ${stock.gasType} is out of stock`
      });
    } else if (stock.availableQuantity < stock.minStockLevel && stock.isAvailable) {
      this.stockAlerts.push({
        gasType: stock.gasType,
        brandName: stock.brandName,
        alertType: 'low_stock',
        message: `${stock.brandName} ${stock.gasType} is running low (${stock.availableQuantity} units remaining)`
      });
    } else if (stock.availableQuantity > stock.maxStockLevel) {
      this.stockAlerts.push({
        gasType: stock.gasType,
        brandName: stock.brandName,
        alertType: 'overstocked',
        message: `${stock.brandName} ${stock.gasType} is overstocked (${stock.availableQuantity} units)`
      });
    }
  });
  
  next();
});

ShopStockSchema.methods.updateStock = function(brandName, gasType, quantity, action, userId, userRole, reason = '') {
  const stockIndex = this.gasStocks.findIndex(
    s => s.brandName === brandName && s.gasType === gasType
  );
  
  if (stockIndex === -1) {
    throw new Error(`Stock not found for ${brandName} ${gasType}`);
  }
  
  const stock = this.gasStocks[stockIndex];
  const previousQuantity = stock.availableQuantity;
  
  switch(action) {
    case 'restock':
      stock.availableQuantity += quantity;
      stock.lastRestockDate = new Date();
      break;
    case 'sale':
      if (stock.availableQuantity < quantity) {
        throw new Error('Insufficient stock');
      }
      stock.availableQuantity -= quantity;
      break;
    case 'adjustment':
      stock.availableQuantity = quantity;
      break;
    case 'return':
      stock.availableQuantity += quantity;
      break;
    case 'damage':
      if (stock.availableQuantity < quantity) {
        throw new Error('Cannot report damage for more than available stock');
      }
      stock.availableQuantity -= quantity;
      break;
    default:
      throw new Error('Invalid action');
  }
  
  this.stockHistory.push({
    action,
    brandName,
    gasType,
    quantity,
    previousQuantity,
    newQuantity: stock.availableQuantity,
    reason,
    performedBy: userId,
    performedByRole: userRole
  });
  
  this.lastUpdatedBy = userId;
  this.updatedByRole = userRole;
  
  return this.save();
};

ShopStockSchema.methods.getAvailableStock = function(brandName, gasType) {
  const stock = this.gasStocks.find(
    s => s.brandName === brandName && s.gasType === gasType
  );
  return stock ? stock.availableQuantity - stock.reservedQuantity : 0;
};

ShopStockSchema.methods.reserveStock = function(brandName, gasType, quantity) {
  const stock = this.gasStocks.find(
    s => s.brandName === brandName && s.gasType === gasType
  );
  
  if (!stock) {
    throw new Error(`Stock not found for ${brandName} ${gasType}`);
  }
  
  if (this.getAvailableStock(brandName, gasType) < quantity) {
    throw new Error('Insufficient available stock');
  }
  
  stock.reservedQuantity += quantity;
  return this.save();
};

ShopStockSchema.methods.releaseReservation = function(brandName, gasType, quantity) {
  const stock = this.gasStocks.find(
    s => s.brandName === brandName && s.gasType === gasType
  );
  
  if (!stock) {
    throw new Error(`Stock not found for ${brandName} ${gasType}`);
  }
  
  stock.reservedQuantity = Math.max(0, stock.reservedQuantity - quantity);
  return this.save();
};

// Next Arrival Management Methods
ShopStockSchema.methods.scheduleNextArrival = function(brandName, gasType, arrivalDate, expectedQuantity, userId, notes = '') {
  const stock = this.gasStocks.find(
    s => s.brandName === brandName && s.gasType === gasType
  );
  
  if (!stock) {
    throw new Error(`Stock not found for ${brandName} ${gasType}`);
  }
  
  stock.nextArrival = {
    arrivalDate,
    expectedQuantity,
    autoUpdateEnabled: true,
    scheduledBy: userId,
    scheduledAt: new Date(),
    status: 'scheduled',
    notes
  };
  
  return this.save();
};

ShopStockSchema.methods.cancelNextArrival = function(brandName, gasType, userId) {
  const stock = this.gasStocks.find(
    s => s.brandName === brandName && s.gasType === gasType
  );
  
  if (!stock) {
    throw new Error(`Stock not found for ${brandName} ${gasType}`);
  }
  
  if (stock.nextArrival && stock.nextArrival.status === 'scheduled') {
    stock.nextArrival.status = 'cancelled';
    stock.nextArrival.autoUpdateEnabled = false;
    
    this.stockHistory.push({
      action: 'adjustment',
      brandName,
      gasType,
      quantity: 0,
      previousQuantity: stock.availableQuantity,
      newQuantity: stock.availableQuantity,
      reason: 'Next arrival cancelled',
      performedBy: userId,
      performedByRole: 'SalesAgent'
    });
  }
  
  return this.save();
};

ShopStockSchema.methods.executeArrival = function(brandName, gasType) {
  const stock = this.gasStocks.find(
    s => s.brandName === brandName && s.gasType === gasType
  );
  
  if (!stock || !stock.nextArrival || stock.nextArrival.status !== 'scheduled') {
    return false;
  }
  
  const arrival = stock.nextArrival;
  if (arrival.autoUpdateEnabled && new Date() >= arrival.arrivalDate) {
    const previousQuantity = stock.availableQuantity;
    stock.availableQuantity += arrival.expectedQuantity;
    stock.lastRestockDate = new Date();
    arrival.status = 'completed';
    arrival.autoUpdateEnabled = false;
    
    this.stockHistory.push({
      action: 'restock',
      brandName,
      gasType,
      quantity: arrival.expectedQuantity,
      previousQuantity,
      newQuantity: stock.availableQuantity,
      reason: `Automated arrival restock - ${arrival.notes}`,
      performedBy: arrival.scheduledBy,
      performedByRole: 'SalesAgent'
    });
    
    return this.save();
  }
  
  return false;
};

export default mongoose.model('ShopStock', ShopStockSchema);