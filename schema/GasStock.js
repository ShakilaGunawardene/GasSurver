import mongoose from 'mongoose';

const GasStockSchema = new mongoose.Schema(
  {
    
    gasCenterName: { type: String, required: true },
    gasBrand: { type: String, required: true },
    gasType: { type: String, required: true },
    gasAvailableQty: { type: Number, required: true },
    nextArrivalDate: { type: Date, required: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  { timestamps: true }
);

export default mongoose.model('GasStock', GasStockSchema);
