const express = require('express');
const router = express.Router();
const {
  registerGasStock,
  getAllGasStocks,
  getGasStockById,
  updateGasStock,
  deleteGasStock
} = require('../controller/GasStockController');

router.post('/register', registerGasStock);
router.get('/getAllGasStocks', getAllGasStocks);
router.get('/getGasStockById/:id', getGasStockById);
router.put('/updateGasStock/:id', updateGasStock);
router.delete('/deleteGasStock/:id', deleteGasStock);

module.exports = router;
