const express = require('express');
const router = express.Router();
const {registerSalesAgent, } = require("../controller/SalesAgentController");

//Route:
router.post('/register',registerSalesAgent);

module.exports = router;