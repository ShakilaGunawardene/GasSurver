import Admin from '../schema/Admin.js';
import Customer from '../schema/Customer.js';
import SalesAgent from '../schema/SalesAgent.js';
import Shop from '../schema/Shop.js';
import Order from '../schema/Order.js';
import bcrypt from 'bcryptjs';

// Create Admin
const registerAdmin = async (req, res) => {
  const {adminName, email, password } = req.body;

  try {
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Admin already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      adminName,
      email,
      password: hashedPassword,
    });

    await admin.save();
    res.status(201).json({ message: 'Admin registered', admin });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read All Admins
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read Admin by ID
const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Update Admin
const updateAdmin = async (req, res) => {
  const { adminId, adminName, email, password } = req.body;

  try {
    const updated = await Admin.findByIdAndUpdate(
      req.params.id,
      { adminId, adminName, email, password },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin updated', admin: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete Admin
const deleteAdmin = async (req, res) => {
  try {
    const deleted = await Admin.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin deleted', admin: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get Comprehensive Sales Report (Admin only)
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Set default date range if not provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Build query for date range
    const dateQuery = {
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    // Get all orders within date range for comprehensive analysis
    const allOrders = await Order.find(dateQuery)
      .populate('gasStockId')
      .populate('shopId')
      .populate('customerId', 'customerName customerEmail');

    // Get only delivered orders for revenue calculations
    const deliveredOrders = allOrders.filter(order => order.orderStatus === 'Delivered');

    // Calculate basic metrics
    const totalOrders = deliveredOrders.length;
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + (order.orderDetails?.totalPrice || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Order Status Analysis
    const orderStatusStats = {};
    allOrders.forEach(order => {
      const status = order.orderStatus;
      orderStatusStats[status] = (orderStatusStats[status] || 0) + 1;
    });

    // Payment Method Analysis
    const paymentMethodStats = {};
    deliveredOrders.forEach(order => {
      const method = order.paymentInfo?.paymentMethod || 'Unknown';
      if (!paymentMethodStats[method]) {
        paymentMethodStats[method] = { orders: 0, revenue: 0 };
      }
      paymentMethodStats[method].orders += 1;
      paymentMethodStats[method].revenue += order.orderDetails?.totalPrice || 0;
    });

    // Gas Type & Size Analysis
    const gasTypeStats = {};
    const gasSizeStats = {};
    deliveredOrders.forEach(order => {
      const orderRevenue = order.orderDetails?.totalPrice || 0;
      const quantity = order.orderDetails?.quantity || 1;
      
      // Gas brand analysis
      const gasBrand = order.orderDetails?.gasBrand || 'Unknown';
      if (!gasTypeStats[gasBrand]) {
        gasTypeStats[gasBrand] = { orders: 0, revenue: 0, quantity: 0 };
      }
      gasTypeStats[gasBrand].orders += 1;
      gasTypeStats[gasBrand].revenue += orderRevenue;
      gasTypeStats[gasBrand].quantity += quantity;

      // Gas size analysis
      const gasSize = order.orderDetails?.gasType || 'Unknown';
      if (!gasSizeStats[gasSize]) {
        gasSizeStats[gasSize] = { orders: 0, revenue: 0, quantity: 0 };
      }
      gasSizeStats[gasSize].orders += 1;
      gasSizeStats[gasSize].revenue += orderRevenue;
      gasSizeStats[gasSize].quantity += quantity;
    });

    // Station/Shop Analysis
    const stationStats = {};
    deliveredOrders.forEach(order => {
      const orderRevenue = order.orderDetails?.totalPrice || 0;
      const stationName = order.shopId?.shopName || 
                         order.gasStockId?.gasCenterName || 
                         'Unknown Station';
      if (!stationStats[stationName]) {
        stationStats[stationName] = { orders: 0, revenue: 0 };
      }
      stationStats[stationName].orders += 1;
      stationStats[stationName].revenue += orderRevenue;
    });

    // Customer Analysis
    const customerStats = {};
    deliveredOrders.forEach(order => {
      const customerId = order.customerId?._id?.toString();
      const customerName = order.customerId?.customerName || 'Unknown Customer';
      const orderRevenue = order.orderDetails?.totalPrice || 0;
      
      if (customerId) {
        if (!customerStats[customerId]) {
          customerStats[customerId] = { 
            name: customerName, 
            orders: 0, 
            revenue: 0 
          };
        }
        customerStats[customerId].orders += 1;
        customerStats[customerId].revenue += orderRevenue;
      }
    });

    // Delivery Performance Analysis
    const deliveryStats = {
      totalDeliveries: deliveredOrders.length,
      averageDeliveryTime: 0,
      onTimeDeliveries: 0
    };

    let totalDeliveryTime = 0;
    let deliveryTimeCount = 0;

    deliveredOrders.forEach(order => {
      if (order.actualDeliveryTime && order.estimatedDeliveryTime) {
        const estimatedTime = new Date(order.estimatedDeliveryTime);
        const actualTime = new Date(order.actualDeliveryTime);
        const deliveryTime = (actualTime - new Date(order.createdAt)) / (1000 * 60 * 60); // hours
        
        totalDeliveryTime += deliveryTime;
        deliveryTimeCount += 1;
        
        if (actualTime <= estimatedTime) {
          deliveryStats.onTimeDeliveries += 1;
        }
      }
    });

    deliveryStats.averageDeliveryTime = deliveryTimeCount > 0 ? totalDeliveryTime / deliveryTimeCount : 0;
    deliveryStats.onTimeDeliveryRate = deliveredOrders.length > 0 ? 
      (deliveryStats.onTimeDeliveries / deliveredOrders.length) * 100 : 0;

    // Time-based trend analysis
    const dailyStats = {};
    deliveredOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { orders: 0, revenue: 0 };
      }
      dailyStats[dateKey].orders += 1;
      dailyStats[dateKey].revenue += order.orderDetails?.totalPrice || 0;
    });

    // Convert to arrays for frontend
    const byStation = Object.entries(stationStats)
      .map(([station, stats]) => ({ station, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    const byGasBrand = Object.entries(gasTypeStats)
      .map(([brand, stats]) => ({ gasBrand: brand, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    const byGasSize = Object.entries(gasSizeStats)
      .map(([size, stats]) => ({ gasSize: size, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    const byPaymentMethod = Object.entries(paymentMethodStats)
      .map(([method, stats]) => ({ paymentMethod: method, ...stats }));

    const topCustomers = Object.entries(customerStats)
      .map(([id, stats]) => ({ customerId: id, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const dailyTrends = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      message: 'Comprehensive sales report generated successfully',
      report: {
        // Summary metrics
        summary: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          totalCustomers: Object.keys(customerStats).length,
          dateRange: { startDate: start, endDate: end }
        },
        
        // Status breakdown
        orderStatus: Object.entries(orderStatusStats).map(([status, count]) => ({
          status,
          count,
          percentage: ((count / allOrders.length) * 100).toFixed(1)
        })),
        
        // Detailed breakdowns
        byStation,
        byGasBrand,
        byGasSize,
        byPaymentMethod,
        topCustomers,
        dailyTrends,
        
        // Performance metrics
        deliveryPerformance: deliveryStats
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error generating sales report', 
      error: error.message 
    });
  }
};

// Get System Statistics (Admin only)
const getSystemStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalSalesAgents,
      totalShops,
      activeShops,
      pendingAgents,
      totalOrders,
      recentOrders
    ] = await Promise.all([
      Customer.countDocuments(),
      SalesAgent.countDocuments(),
      Shop.countDocuments(),
      Shop.countDocuments({ status: 'active' }),
      SalesAgent.countDocuments({ approvalStatus: 'pending' }),
      Order.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('customerId gasStockId')
    ]);

    const stats = {
      customers: {
        total: totalCustomers,
        recent: await Customer.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      },
      salesAgents: {
        total: totalSalesAgents,
        pending: pendingAgents,
        approved: await SalesAgent.countDocuments({ approvalStatus: 'approved' })
      },
      shops: {
        total: totalShops,
        active: activeShops,
        inactive: totalShops - activeShops
      },
      orders: {
        total: totalOrders,
        thisMonth: await Order.countDocuments({
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }),
        recent: recentOrders
      }
    };

    res.json({
      message: 'System statistics retrieved successfully',
      stats
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving system statistics', 
      error: error.message 
    });
  }
};

// Get Order Trends (Admin only) - For time-series charts
const getOrderTrends = async (req, res) => {
  try {
    const { startDate, endDate, granularity = 'daily' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });

    const trends = {};
    
    orders.forEach(order => {
      let dateKey;
      const orderDate = new Date(order.createdAt);
      
      if (granularity === 'hourly') {
        dateKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}-${orderDate.getDate().toString().padStart(2, '0')} ${orderDate.getHours().toString().padStart(2, '0')}:00`;
      } else if (granularity === 'weekly') {
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        dateKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        dateKey = orderDate.toISOString().split('T')[0];
      }
      
      if (!trends[dateKey]) {
        trends[dateKey] = {
          date: dateKey,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          pendingOrders: 0,
          revenue: 0
        };
      }
      
      trends[dateKey].totalOrders += 1;
      
      if (order.orderStatus === 'Delivered') {
        trends[dateKey].deliveredOrders += 1;
        trends[dateKey].revenue += order.orderDetails?.totalPrice || 0;
      } else if (order.orderStatus === 'Cancelled') {
        trends[dateKey].cancelledOrders += 1;
      } else if (['Pending', 'Confirmed', 'Processing', 'Out for Delivery'].includes(order.orderStatus)) {
        trends[dateKey].pendingOrders += 1;
      }
    });

    const trendData = Object.values(trends).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      message: 'Order trends retrieved successfully',
      trends: trendData,
      granularity,
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving order trends',
      error: error.message
    });
  }
};

// Get Customer Analytics (Admin only)
const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get customer registration trends
    const customers = await Customer.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });

    // Get orders for customer analysis
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).populate('customerId', 'customerName customerEmail createdAt');

    // Customer registration trends
    const registrationTrends = {};
    customers.forEach(customer => {
      const dateKey = customer.createdAt.toISOString().split('T')[0];
      registrationTrends[dateKey] = (registrationTrends[dateKey] || 0) + 1;
    });

    // Customer behavior analysis
    const customerBehavior = {};
    orders.forEach(order => {
      const customerId = order.customerId?._id?.toString();
      if (customerId) {
        if (!customerBehavior[customerId]) {
          customerBehavior[customerId] = {
            name: order.customerId.customerName,
            email: order.customerId.customerEmail,
            registrationDate: order.customerId.createdAt,
            totalOrders: 0,
            totalSpent: 0,
            averageOrderValue: 0,
            lastOrderDate: null,
            status: 'active'
          };
        }
        
        customerBehavior[customerId].totalOrders += 1;
        if (order.orderStatus === 'Delivered') {
          customerBehavior[customerId].totalSpent += order.orderDetails?.totalPrice || 0;
        }
        
        if (!customerBehavior[customerId].lastOrderDate || 
            new Date(order.createdAt) > new Date(customerBehavior[customerId].lastOrderDate)) {
          customerBehavior[customerId].lastOrderDate = order.createdAt;
        }
      }
    });

    // Calculate averages and categorize customers
    Object.values(customerBehavior).forEach(customer => {
      customer.averageOrderValue = customer.totalOrders > 0 ? 
        customer.totalSpent / customer.totalOrders : 0;
      
      const daysSinceLastOrder = customer.lastOrderDate ? 
        (new Date() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24) : Infinity;
      
      if (daysSinceLastOrder > 90) {
        customer.status = 'inactive';
      } else if (daysSinceLastOrder > 30) {
        customer.status = 'at_risk';
      }
    });

    // Customer segments
    const segments = {
      new: Object.values(customerBehavior).filter(c => c.totalOrders === 1).length,
      returning: Object.values(customerBehavior).filter(c => c.totalOrders > 1 && c.totalOrders <= 5).length,
      loyal: Object.values(customerBehavior).filter(c => c.totalOrders > 5).length,
      active: Object.values(customerBehavior).filter(c => c.status === 'active').length,
      at_risk: Object.values(customerBehavior).filter(c => c.status === 'at_risk').length,
      inactive: Object.values(customerBehavior).filter(c => c.status === 'inactive').length
    };

    const topCustomers = Object.values(customerBehavior)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20);

    res.json({
      message: 'Customer analytics retrieved successfully',
      analytics: {
        registrationTrends: Object.entries(registrationTrends).map(([date, count]) => ({ date, count })),
        segments,
        topCustomers,
        totalCustomers: Object.keys(customerBehavior).length
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving customer analytics',
      error: error.message
    });
  }
};

// Get Agent Performance Analytics (Admin only)
const getAgentPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get sales agents with their shops
    const salesAgents = await SalesAgent.find({ approvalStatus: 'approved' });
    const shops = await Shop.find().populate('salesAgentId', 'salesAgentName salesAgentEmail');
    
    // Get orders within date range
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).populate('shopId');

    const agentPerformance = {};
    
    // Initialize agent stats
    salesAgents.forEach(agent => {
      agentPerformance[agent._id.toString()] = {
        agentId: agent._id,
        name: agent.salesAgentName,
        email: agent.email,
        assignedShops: shops.filter(shop => 
          shop.salesAgentId?._id?.toString() === agent._id.toString()
        ).length,
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        revenue: 0,
        averageOrderValue: 0
      };
    });

    // Calculate performance from orders
    orders.forEach(order => {
      const shopAgent = order.shopId?.salesAgentId?.toString();
      if (shopAgent && agentPerformance[shopAgent]) {
        agentPerformance[shopAgent].totalOrders += 1;
        
        if (order.orderStatus === 'Delivered') {
          agentPerformance[shopAgent].deliveredOrders += 1;
          agentPerformance[shopAgent].revenue += order.orderDetails?.totalPrice || 0;
        } else if (order.orderStatus === 'Cancelled') {
          agentPerformance[shopAgent].cancelledOrders += 1;
        }
      }
    });

    // Calculate averages
    Object.values(agentPerformance).forEach(agent => {
      agent.averageOrderValue = agent.deliveredOrders > 0 ? 
        agent.revenue / agent.deliveredOrders : 0;
      agent.successRate = agent.totalOrders > 0 ? 
        (agent.deliveredOrders / agent.totalOrders) * 100 : 0;
    });

    const performanceList = Object.values(agentPerformance)
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      message: 'Agent performance retrieved successfully',
      performance: performanceList
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving agent performance',
      error: error.message
    });
  }
};

export {
  registerAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getSalesReport,
  getSystemStats,
  getOrderTrends,
  getCustomerAnalytics,
  getAgentPerformance
};
