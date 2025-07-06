const express = require('express');
const router = express.Router();
const {registerSalesAgent, getAllSalesAgent, getSalesAgentById, updateSalesAgent, deleteSalesAgent} = require("../controller/SalesAgentController");

//Route:
router.post('/register',registerSalesAgent);
router.get('/getAllUsers',getAllSalesAgent);
router.get('/getUserById',getSalesAgentById);
router.put('/updateUser',updateSalesAgent);
router.delete('/deleteUser',deleteSalesAgent);

module.exports = router;