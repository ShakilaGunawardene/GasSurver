const express = require('express');
const { protect } = require('../Security/VerifyToken');
const router = express.Router();
const {
  registerAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} = require("../controller/AdminController");

router.post('/register',protect(['admin']), registerAdmin);
router.get('/getAllAdmins',protect(['admin']), getAllAdmins);
router.get('/getAdminById/:id',protect(['admin']), getAdminById);
router.put('/updateAdmin/:id',protect(['admin']), updateAdmin);
router.delete('/deleteAdmin/:id',protect(['admin']), deleteAdmin);
module.exports = router;


