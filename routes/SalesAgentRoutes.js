const express = require('express');
const router = express.Router();
const {registerSalesAgent, getAllSalesAgent, getSalesAgentById, updateSalesAgent, deleteSalesAgent} = require("../controller/SalesAgentController");

//Route:
router.post('/register',registerSalesAgent);
router.get('/getAllSalesAgent',getAllSalesAgent);
router.get('/getSalesAgentById/:id',getSalesAgentById);
router.put('/updateSalesAgent/:id',updateSalesAgent);
router.delete('/deleteSalesAgent/:id',deleteSalesAgent);

module.exports = router;