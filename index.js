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

dotenv.config();

const app = express();
const PORT = 3000;


 app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend URL
  credentials: true, // Allow cookies, tokens, etc.
}));

app.use(express.json());



app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

// Routes
app.use('/SalesAgent/', SalesAgentRoutes);
app.use('/Customer/', CustomerRoutes);
app.use('/Admin/', AdminRoutes);
app.use('/GasStock/', GasStockRoutes);
app.use('/Delivery/', DeliveryRoutes);
app.use('/Auth/', AuthRoutes);


mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('DB connection error:', err));

