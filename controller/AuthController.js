import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../schema/Admin.js";
import Customer from "../schema/Customer.js";
import SalesAgent from "../schema/SalesAgent.js";
import Shop from "../schema/Shop.js";

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Try to find user in Admin, Customer, or SalesAgent collections
    const user =
      (await Admin.findOne({ email })) ||
      (await Customer.findOne({ email })) ||
      (await SalesAgent.findOne({ email }));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    let additionalData = {};
    
    if (user.role === 'salesAgent' || user.role === 'salesagent') {
      // Check approval status for sales agents
      if (user.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          message: `Your account is ${user.approvalStatus}. Please wait for admin approval.`,
          approvalStatus: user.approvalStatus,
          submittedAt: user.createdAt
        });
      }

      const assignedShops = await Shop.find({ 
        salesAgentId: user._id,
        status: { $ne: 'closed' }
      }).select('_id shopName shopCode status');
      
      additionalData = {
        assignedShops: assignedShops,
        totalShops: assignedShops.length,
        activeShops: assignedShops.filter(s => s.status === 'active').length,
        approvalStatus: user.approvalStatus,
        approvedAt: user.approvedAt
      };
    }
    
    if (user.role === 'admin') {
      const totalShops = await Shop.countDocuments();
      const activeShops = await Shop.countDocuments({ status: 'active' });
      const totalAgents = await SalesAgent.countDocuments();
      
      additionalData = {
        stats: {
          totalShops,
          activeShops,
          totalAgents
        }
      };
    }
    
    if (user.role === 'customer') {
      additionalData = {
        name: user.customerName || user.name,
        phone: user.customerPhone || user.phone,
        preferences: user.preferences || {}
      };
    }
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.adminName || user.customerName || user.salesAgentName || user.name,
        ...additionalData
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPendingSalesAgents = async (req, res) => {
  try {
    const pendingAgents = await SalesAgent.find({ 
      approvalStatus: 'pending' 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      message: 'Pending sales agents retrieved successfully',
      agents: pendingAgents,
      count: pendingAgents.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving pending sales agents', 
      error: error.message 
    });
  }
};

const approveSalesAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const adminId = req.user.id;

    const agent = await SalesAgent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ 
        message: 'Sales agent not found' 
      });
    }

    if (agent.approvalStatus !== 'pending') {
      return res.status(400).json({ 
        message: 'Sales agent is not in pending status' 
      });
    }

    agent.approvalStatus = 'approved';
    agent.approvedBy = adminId;
    agent.approvedAt = new Date();
    await agent.save();

    const approvedAgent = await SalesAgent.findById(agentId)
      .select('-password')
      .populate('approvedBy', 'adminName email');

    res.json({
      message: 'Sales agent approved successfully',
      agent: approvedAgent
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error approving sales agent', 
      error: error.message 
    });
  }
};

const rejectSalesAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;

    const agent = await SalesAgent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ 
        message: 'Sales agent not found' 
      });
    }

    if (agent.approvalStatus !== 'pending') {
      return res.status(400).json({ 
        message: 'Sales agent is not in pending status' 
      });
    }

    agent.approvalStatus = 'rejected';
    agent.approvedBy = adminId;
    agent.approvedAt = new Date();
    agent.rejectionReason = rejectionReason || 'No reason provided';
    await agent.save();

    const rejectedAgent = await SalesAgent.findById(agentId)
      .select('-password')
      .populate('approvedBy', 'adminName email');

    res.json({
      message: 'Sales agent rejected successfully',
      agent: rejectedAgent
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error rejecting sales agent', 
      error: error.message 
    });
  }
};

const getAllSalesAgents = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status) {
      query.approvalStatus = status;
    }

    const agents = await SalesAgent.find(query)
      .select('-password')
      .populate('approvedBy', 'adminName email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Sales agents retrieved successfully',
      agents: agents,
      count: agents.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving sales agents', 
      error: error.message 
    });
  }
};

export { 
  login, 
  getPendingSalesAgents, 
  approveSalesAgent, 
  rejectSalesAgent, 
  getAllSalesAgents 
};
