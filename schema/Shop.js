import mongoose from 'mongoose';

const ShopSchema = new mongoose.Schema(
  {
    shopName: { 
      type: String, 
      required: true,
      trim: true
    },
    shopCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      district: { type: String, required: true },
      province: { type: String, required: true },
      postalCode: { type: String },
      landmark: { type: String }
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    contactInfo: {
      primaryPhone: { type: String, required: true },
      secondaryPhone: { type: String },
      email: { type: String },
      emergencyContact: { type: String }
    },
    operatingHours: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
    },
    salesAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesAgent',
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'closed'],
      default: 'active'
    },
    facilities: {
      hasParking: { type: Boolean, default: false },
      hasToilet: { type: Boolean, default: false },
      acceptsCard: { type: Boolean, default: true },
      acceptsCash: { type: Boolean, default: true },
      hasDelivery: { type: Boolean, default: true },
      deliveryRadius: { type: Number, default: 5 }
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 }
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    lastInspection: {
      type: Date,
      default: null
    },
    nextInspection: {
      type: Date,
      default: null
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true
    },
    licenseExpiry: {
      type: Date,
      required: true
    },
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

ShopSchema.index({ location: '2dsphere' });
ShopSchema.index({ 'address.city': 1, 'address.district': 1 });
ShopSchema.index({ status: 1 });
ShopSchema.index({ salesAgentId: 1 });

ShopSchema.virtual('isOpen').get(function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const currentTime = now.getHours() * 100 + now.getMinutes();
  
  const todayHours = this.operatingHours[today];
  if (!todayHours.isOpen) return false;
  
  const openTime = parseInt(todayHours.open?.replace(':', '') || '0');
  const closeTime = parseInt(todayHours.close?.replace(':', '') || '2359');
  
  return currentTime >= openTime && currentTime <= closeTime;
});

ShopSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.ratings.average * this.ratings.count;
  this.ratings.count += 1;
  this.ratings.average = (currentTotal + newRating) / this.ratings.count;
  return this.save();
};

export default mongoose.model('Shop', ShopSchema);