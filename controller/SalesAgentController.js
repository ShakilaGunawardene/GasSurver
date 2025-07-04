const SalesAgent = require('../schema/SalesAgent');

// Create SalesAgent (Register)
const registerSalesAgent = async (req, res) => {
  const { salesAgentId, salesAgentName, salesAgentGasBrandName, salesAgentGasType, salesAgentEmail,salesAgentPassword } = req.body;
  try {
    const exists = await SalesAgent.findOne({ salesAgentEmail });
    if (exists) return res.status(400).json({ message: 'Driver already exists' });

    const salesAgent = new SalesAgent({ salesAgentId, salesAgentName, salesAgentGasBrandName, salesAgentGasType, salesAgentEmail,salesAgentPassword });
    await salesAgent.save();
    res.status(201).json({ message: 'SalesAgent registered', salesAgent });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

module.exports = {
  registerSalesAgent,
//   getAllUsers,
//   getUserById,
//   updateUser,
//   deleteUser
};