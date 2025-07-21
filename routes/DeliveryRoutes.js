import express from 'express';
import {
  requestDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDeliveryStatus,
  deleteDelivery
} from '../controller/DeliveryController.js';

const router = express.Router();

router.post('/request', requestDelivery);
router.get('/getAllDeliveries', getAllDeliveries);
router.get('/getDeliveryById/:id', getDeliveryById);
router.put('/updateStatus/:id', updateDeliveryStatus);
router.delete('/deleteDelivery/:id', deleteDelivery);

export default router;
