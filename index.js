import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import SalesAgentRoutes from './routes/SalesAgentRoutes.js';
import CustomerRoutes from './routes/CustomerRoutes.js';
import AdminRoutes from './routes/AdminRoutes.js';
import GasStockRoutes from './routes/GasStockRoutes.js';
import DeliveryRoutes from './routes/DeliveryRoutes.js';
import AuthRoutes from './routes/AuthRoutes.js';
import OrderRoutes from './routes/OrderRoutes.js';
import ShopRoutes from './routes/ShopRoutes.js';
import PriceRoutes from './routes/PriceRoutes.js';
import stockScheduler from './utils/stockScheduler.js';

dotenv.config();

const app = express();
const PORT = 3000;


 app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Frontend URLs
  credentials: true, // Allow cookies, tokens, etc.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Routes
app.use('/SalesAgent', SalesAgentRoutes);
app.use('/Customer', CustomerRoutes);
app.use('/Admin', AdminRoutes);
app.use('/GasStock', GasStockRoutes);
app.use('/Delivery', DeliveryRoutes);
app.use('/Auth', AuthRoutes);
app.use('/Order', OrderRoutes);
app.use('/Shop', ShopRoutes);
app.use('/Price', PriceRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});


mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected');
    
    // Start the stock scheduler after database connection
    console.log('Starting automated stock arrival system...');
    stockScheduler.start();
  })
  .catch((err) => console.log('DB connection error:', err));

