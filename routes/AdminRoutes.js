const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} = require("../controller/AdminController");

router.post('/register', registerAdmin);
router.get('/getAllAdmins', getAllAdmins);
router.get('/getAdminById/:id', getAdminById);
router.put('/updateAdmin/:id', updateAdmin);
router.delete('/deleteAdmin/:id', deleteAdmin);

module.exports = router;