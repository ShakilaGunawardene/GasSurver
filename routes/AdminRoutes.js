import express from 'express';
import { protect } from '../Security/VerifyToken.js';
import {
  registerAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} from '../controller/AdminController.js';

const router = express.Router();

router.post('/register', registerAdmin);
router.get('/getAllAdmins', protect(['admin']), getAllAdmins);
router.get('/getAdminById/:id', protect(['admin']), getAdminById);
router.put('/updateAdmin/:id', protect(['admin']), updateAdmin);
router.delete('/deleteAdmin/:id', protect(['admin']), deleteAdmin);

export default router;
