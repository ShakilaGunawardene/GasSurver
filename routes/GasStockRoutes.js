import express from 'express';
import {
  registerGasStock,
  getAllGasStocks,
  getGasStockById,
  updateGasStock,
  deleteGasStock
} from '../controller/GasStockController.js';

const router = express.Router();

router.post('/register', registerGasStock);
router.get('/getAllGasStocks', getAllGasStocks);
router.get('/getGasStockById/:id', getGasStockById);
router.put('/updateGasStock/:id', updateGasStock);
router.delete('/deleteGasStock/:id', deleteGasStock);

export default router;
