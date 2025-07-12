const express = require('express');
const router = express.Router();
const {
  requestDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDeliveryStatus,
  deleteDelivery
} = require('../controller/DiliveryController');

router.post('/request', requestDelivery);
router.get('/getAllDeliveries', getAllDeliveries);
router.get('/getDeliveryById/:id', getDeliveryById);
router.put('/updateStatus/:id', updateDeliveryStatus);
router.delete('/deleteDelivery/:id', deleteDelivery);

module.exports = router;
