import bcrypt from 'bcryptjs';
import SalesAgent from '../schema/SalesAgent.js';
import Shop from '../schema/Shop.js';
import ShopStock from '../schema/ShopStock.js';
import Order from '../schema/Order.js';
import StockManager from '../services/StockManager.js';
import stockScheduler from '../utils/stockScheduler.js';

// Register SalesAgent
const registerSalesAgent = async (req, res) => {
  const {
    salesAgentName,
    salesAgentGasBrandName,
    email,
    password,
    registrationId,
    location
  } = req.body;

  try {
    // Check for existing email
    const emailExists = await SalesAgent.findOne({ email });
    if (emailExists) return res.status(400).json({ message: 'Email already exists' });

    // Check for existing registration ID
    const regIdExists = await SalesAgent.findOne({ registrationId });
    if (regIdExists) return res.status(400).json({ message: 'Registration ID already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const salesAgent = new SalesAgent({
      salesAgentName,
      salesAgentGasBrandName,
      email,
      password: hashedPassword,
      registrationId,
      location: location || {
        latitude: 0,
        longitude: 0
      },
      approvalStatus: 'pending'
    });

    await salesAgent.save();
    
    res.status(201).json({ 
      message: 'Sales agent registration submitted successfully. Please wait for admin approval.',
      agent: {
        id: salesAgent._id,
        name: salesAgent.salesAgentName,
        email: salesAgent.email,
        brandName: salesAgent.salesAgentGasBrandName,
        approvalStatus: salesAgent.approvalStatus,
        submittedAt: salesAgent.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// Get All SalesAgents
const getAllSalesAgent = async (req, res) => {
  try {
    const salesAgent = await SalesAgent.find();
    res.json(salesAgent);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get SalesAgent by ID
const getSalesAgentById = async (req, res) => {
  try {
    const salesAgent = await SalesAgent.findById(req.params.id);
    if (!salesAgent) return res.status(404).json({ message: 'User not found' });
    res.json(salesAgent);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get SalesAgent Profile with Statistics
const getAgentProfile = async (req, res) => {
  try {
    const salesAgentId = req.salesAgent._id;
    
    // Get sales agent data (excluding password)
    const salesAgent = await SalesAgent.findById(salesAgentId)
      .select('-password')
      .populate('approvedBy', 'name email');
    
    if (!salesAgent) {
      return res.status(404).json({ message: 'Sales agent not found' });
    }

    // Get assigned shops statistics
    const shops = await Shop.find({ 
      salesAgentId,
      status: { $ne: 'closed' }
    }).select('_id shopName status createdAt');

    // Calculate shop statistics
    const shopStats = {
      total: shops.length,
      active: shops.filter(shop => shop.status === 'active').length,
      inactive: shops.filter(shop => shop.status === 'inactive').length,
      pending: shops.filter(shop => shop.status === 'pending').length
    };

    // Get total stock value across all shops
    let totalStockValue = 0;
    const shopIds = shops.map(shop => shop._id);
    
    if (shopIds.length > 0) {
      const stockRecords = await ShopStock.find({ shopId: { $in: shopIds } });
      totalStockValue = stockRecords.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);
    }

    // Get recent orders count for agent's shops
    const recentOrders = await Order.countDocuments({
      shopId: { $in: shopIds },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Build profile response
    const profile = {
      // Basic agent information
      _id: salesAgent._id,
      salesAgentName: salesAgent.salesAgentName,
      email: salesAgent.email,
      salesAgentGasBrandName: salesAgent.salesAgentGasBrandName,
      registrationId: salesAgent.registrationId,
      role: salesAgent.role,
      
      // Status and approval information
      approvalStatus: salesAgent.approvalStatus,
      approvedBy: salesAgent.approvedBy,
      approvedAt: salesAgent.approvedAt,
      rejectionReason: salesAgent.rejectionReason,
      createdAt: salesAgent.createdAt,
      updatedAt: salesAgent.updatedAt,
      
      // Location information
      location: salesAgent.location,
      
      // Statistics
      statistics: {
        shops: shopStats,
        totalStockValue,
        recentOrders,
        accountAge: Math.floor((Date.now() - new Date(salesAgent.createdAt).getTime()) / (1000 * 60 * 60 * 24)), // Days since registration
        lastLogin: new Date().toISOString() // Current time as proxy for last login
      },
      
      // Recent shops (last 3 created)
      recentShops: shops
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
        .map(shop => ({
          _id: shop._id,
          shopName: shop.shopName,
          status: shop.status,
          createdAt: shop.createdAt
        }))
    };

    res.json({
      message: 'Agent profile retrieved successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching agent profile', 
      error: error.message 
    });
  }
};

// Update SalesAgent
const updateSalesAgent = async (req, res) => {
  const {
    
    salesAgentName,
    salesAgentGasBrandName,
    email,
    password
  } = req.body;

  try {
    const updated = await SalesAgent.findByIdAndUpdate(
      req.params.id,
      {  salesAgentName, salesAgentGasBrandName, email, password },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Sales Agents not found' });
    res.json({ message: 'Sales Agent updated', salesAgent: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete SalesAgent
const deleteSalesAgent = async (req, res) => {
  try {
    const deleted = await SalesAgent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'SalesAgent not found' });
    res.json({ message: 'SalesAgent deleted', salesAgent: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

const getAssignedShops = async (req, res) => {
  try {
    const salesAgentId = req.salesAgent._id;
    
    const shops = await Shop.find({ 
      salesAgentId,
      status: { $ne: 'closed' }
    }).select('-__v');
    
    const shopsWithStock = await Promise.all(
      shops.map(async (shop) => {
        const stock = await ShopStock.findOne({ shopId: shop._id })
          .select('gasStocks totalValue stockAlerts');
        return {
          ...shop.toObject(),
          stock: stock || null
        };
      })
    );
    
    res.json({
      message: 'Assigned shops retrieved successfully',
      shops: shopsWithStock,
      totalShops: shopsWithStock.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching assigned shops', 
      error: error.message 
    });
  }
};

const updateShopStock = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { brandName, gasType, quantity, action, reason } = req.body;
    const salesAgentId = req.salesAgent._id;
    
    // Get sales agent details to check brand permission
    const salesAgent = await SalesAgent.findById(salesAgentId);
    if (!salesAgent) {
      return res.status(404).json({ 
        message: 'Sales agent not found' 
      });
    }
    
    // Validate brand permission
    if (brandName && salesAgent.salesAgentGasBrandName !== brandName) {
      return res.status(403).json({ 
        message: `You are only authorized to update ${salesAgent.salesAgentGasBrandName} brand stock. Cannot update ${brandName} stock.`,
        allowedBrand: salesAgent.salesAgentGasBrandName,
        attemptedBrand: brandName
      });
    }
    
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }
    
    if (shop.salesAgentId?.toString() !== salesAgentId.toString()) {
      return res.status(403).json({ 
        message: 'You are not authorized to update stock for this shop' 
      });
    }
    
    if (shop.status !== 'active') {
      return res.status(400).json({ 
        message: 'Cannot update stock for inactive shop' 
      });
    }
    
    let shopStock = await ShopStock.findOne({ shopId });
    
    if (!shopStock) {
      return res.status(404).json({ 
        message: 'Stock record not found for this shop' 
      });
    }
    
    await shopStock.updateStock(
      brandName,
      gasType,
      quantity,
      action,
      salesAgentId,
      'SalesAgent',
      reason
    );
    
    res.json({
      message: 'Stock updated successfully',
      stock: shopStock
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating stock', 
      error: error.message 
    });
  }
};

const getShopStock = async (req, res) => {
  try {
    const { shopId } = req.params;
    const salesAgentId = req.salesAgent._id;
    
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }
    
    if (shop.salesAgentId?.toString() !== salesAgentId.toString()) {
      return res.status(403).json({ 
        message: 'You are not authorized to view stock for this shop' 
      });
    }
    
    const stock = await ShopStock.findOne({ shopId })
      .populate('shopId', 'shopName shopCode');
    
    if (!stock) {
      return res.status(404).json({ 
        message: 'Stock record not found' 
      });
    }
    
    res.json({
      shop: {
        id: shop._id,
        name: shop.shopName,
        code: shop.shopCode,
        status: shop.status
      },
      stock: stock
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching stock', 
      error: error.message 
    });
  }
};

const getStockHistory = async (req, res) => {
  try {
    const { shopId } = req.params;
    const salesAgentId = req.salesAgent._id;
    const { startDate, endDate, action, brandName } = req.query;
    
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }
    
    if (shop.salesAgentId?.toString() !== salesAgentId.toString()) {
      return res.status(403).json({ 
        message: 'You are not authorized to view history for this shop' 
      });
    }
    
    const stock = await ShopStock.findOne({ shopId });
    if (!stock) {
      return res.status(404).json({ 
        message: 'Stock record not found' 
      });
    }
    
    let history = stock.stockHistory;
    
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate) : new Date();
      history = history.filter(h => 
        h.timestamp >= start && h.timestamp <= end
      );
    }
    
    if (action) {
      history = history.filter(h => h.action === action);
    }
    
    if (brandName) {
      history = history.filter(h => h.brandName === brandName);
    }
    
    history.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      shopName: shop.shopName,
      history: history,
      totalRecords: history.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching stock history', 
      error: error.message 
    });
  }
};

const bulkUpdateStock = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { updates } = req.body;
    const salesAgentId = req.salesAgent._id;
    
    // Get sales agent details to check brand permission
    const salesAgent = await SalesAgent.findById(salesAgentId);
    if (!salesAgent) {
      return res.status(404).json({ 
        message: 'Sales agent not found' 
      });
    }
    
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }
    
    if (shop.salesAgentId?.toString() !== salesAgentId.toString()) {
      return res.status(403).json({ 
        message: 'You are not authorized to update stock for this shop' 
      });
    }
    
    if (shop.status !== 'active') {
      return res.status(400).json({ 
        message: 'Cannot update stock for inactive shop' 
      });
    }
    
    // Validate all updates for brand permission before processing any
    for (const update of updates) {
      if (update.brandName && salesAgent.salesAgentGasBrandName !== update.brandName) {
        return res.status(403).json({ 
          message: `You are only authorized to update ${salesAgent.salesAgentGasBrandName} brand stock. Cannot update ${update.brandName} stock in bulk operation.`,
          allowedBrand: salesAgent.salesAgentGasBrandName,
          attemptedBrand: update.brandName,
          affectedUpdate: {
            brandName: update.brandName,
            gasType: update.gasType
          }
        });
      }
    }
    
    const shopStock = await ShopStock.findOne({ shopId });
    if (!shopStock) {
      return res.status(404).json({ 
        message: 'Stock record not found' 
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        const { brandName, gasType, quantity, action, reason } = update;
        await shopStock.updateStock(
          brandName,
          gasType,
          quantity,
          action,
          salesAgentId,
          'SalesAgent',
          reason || 'Bulk update'
        );
        results.push({
          brandName,
          gasType,
          status: 'success'
        });
      } catch (error) {
        errors.push({
          brandName: update.brandName,
          gasType: update.gasType,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Bulk update completed',
      successful: results,
      failed: errors,
      summary: {
        total: updates.length,
        success: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error performing bulk update', 
      error: error.message 
    });
  }
};

const createShop = async (req, res) => {
  try {
    const salesAgentId = req.salesAgent._id;
    const {
      shopName,
      shopCode,
      address,
      location,
      contactInfo,
      operatingHours,
      facilities,
      licenseNumber,
      licenseExpiry,
      notes
    } = req.body;

    // Check if shop code or license number already exists
    const existingShop = await Shop.findOne({ 
      $or: [{ shopCode }, { licenseNumber }] 
    });
    
    if (existingShop) {
      return res.status(400).json({ 
        message: 'Shop with this code or license number already exists' 
      });
    }

    const newShop = new Shop({
      shopName,
      shopCode,
      address,
      location,
      contactInfo,
      operatingHours: operatingHours || {
        monday: { open: '08:00', close: '20:00', isOpen: true },
        tuesday: { open: '08:00', close: '20:00', isOpen: true },
        wednesday: { open: '08:00', close: '20:00', isOpen: true },
        thursday: { open: '08:00', close: '20:00', isOpen: true },
        friday: { open: '08:00', close: '20:00', isOpen: true },
        saturday: { open: '08:00', close: '18:00', isOpen: true },
        sunday: { open: '09:00', close: '17:00', isOpen: false }
      },
      salesAgentId: salesAgentId,
      facilities,
      licenseNumber,
      licenseExpiry,
      notes
    });

    await newShop.save();

    // Create default stock for the new shop with only Laugfs and Litro
    const defaultGasTypes = [
      { brandName: 'Laugfs', gasType: 'Small', gasSize: '2.3kg', unitPrice: 800 },
      { brandName: 'Laugfs', gasType: 'Medium', gasSize: '5kg', unitPrice: 1700 },
      { brandName: 'Laugfs', gasType: 'Large', gasSize: '12.5kg', unitPrice: 4200 },
      { brandName: 'Litro', gasType: 'Small', gasSize: '2.3kg', unitPrice: 780 },
      { brandName: 'Litro', gasType: 'Medium', gasSize: '5kg', unitPrice: 1650 },
      { brandName: 'Litro', gasType: 'Large', gasSize: '12.5kg', unitPrice: 4100 }
    ];

    const shopStock = new ShopStock({
      shopId: newShop._id,
      gasStocks: defaultGasTypes.map(gas => ({
        ...gas,
        availableQuantity: 0,
        minStockLevel: 10,
        maxStockLevel: 100,
        isAvailable: true
      })),
      lastUpdatedBy: salesAgentId,
      updatedByRole: 'SalesAgent'
    });

    await shopStock.save();

    const populatedShop = await Shop.findById(newShop._id)
      .populate('salesAgentId', 'salesAgentName email');

    res.status(201).json({
      message: 'Shop created successfully',
      shop: populatedShop,
      stockInitialized: true
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating shop', 
      error: error.message 
    });
  }
};

// Order Management Functions
const getShopOrders = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const salesAgentId = req.salesAgent._id;

    // Verify shop belongs to this sales agent
    const shop = await Shop.findOne({ _id: shopId, salesAgentId });
    if (!shop) {
      return res.status(403).json({ 
        message: 'Access denied. Shop not assigned to you.' 
      });
    }

    // Build query
    let query = { shopId };
    if (status) {
      // Support comma-separated multiple statuses
      const statusArray = status.split(',').map(s => s.trim());
      if (statusArray.length > 1) {
        query.orderStatus = { $in: statusArray };
      } else {
        query.orderStatus = status;
      }
    }

    // Get orders with pagination
    const orders = await Order.find(query)
      .populate('customerId', 'customerName customerEmail customerPhone customerAddress')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

    res.json({
      message: 'Orders retrieved successfully',
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasNext: page * limit < totalOrders,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving orders', 
      error: error.message 
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const salesAgentId = req.salesAgent._id;

    // Find order and verify shop belongs to sales agent
    const order = await Order.findById(orderId).populate('shopId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify shop belongs to this sales agent
    if (order.shopId.salesAgentId.toString() !== salesAgentId.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. Order not in your shop.' 
      });
    }

    const previousStatus = order.orderStatus;
    let stockResult = null;

    // Handle stock management based on status changes
    switch (status) {
      case 'Confirmed':
        // When order is confirmed, deduct stock from available inventory
        if (previousStatus === 'Pending') {
          stockResult = await StockManager.deductStock(
            order.orderDetails,
            order.shopId?._id,
            order.gasStockId,
            order._id
          );
          
          if (!stockResult.success) {
            return res.status(400).json({ 
              message: 'Cannot confirm order: ' + stockResult.message,
              error: 'Insufficient stock'
            });
          }
        }
        break;

      case 'Cancelled':
        // Restore stock when order is cancelled
        stockResult = await StockManager.restoreStock(
          order.orderDetails,
          order.shopId?._id,
          order.gasStockId,
          order._id,
          `Order cancelled by sales agent: ${notes || 'No reason provided'}`
        );
        
        if (!stockResult.success) {
          console.error('Failed to restore stock for cancelled order:', stockResult.message);
        }

        order.cancellationReason = notes || 'Cancelled by sales agent';
        break;

      case 'Returned':
        // Restore stock when order is returned
        stockResult = await StockManager.restoreStock(
          order.orderDetails,
          order.shopId?._id,
          order.gasStockId,
          order._id,
          `Order returned: ${notes || 'Customer return'}`
        );
        
        if (!stockResult.success) {
          console.error('Failed to restore stock for returned order:', stockResult.message);
        }

        // Handle refund logic if needed
        if (order.paymentInfo?.paymentStatus === 'Paid') {
          order.paymentInfo.paymentStatus = 'Refunded';
          order.refundAmount = order.orderDetails.totalPrice;
        }
        break;

      case 'Processing':
      case 'Out for Delivery':
        // No stock changes needed for these status updates
        break;
        
      case 'Delivered':
        // For COD orders, mark payment as paid when delivered
        if (order.paymentInfo?.paymentMethod === 'Cash on Delivery' && 
            order.paymentInfo?.paymentStatus !== 'Paid') {
          order.paymentInfo.paymentStatus = 'Paid';
          order.paymentInfo.paymentCompletedAt = new Date();
        }
        
        // Set actual delivery time
        order.actualDeliveryTime = new Date();
        break;

      default:
        return res.status(400).json({ message: 'Invalid order status' });
    }

    // Update order status
    order.orderStatus = status;
    
    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: `Sales Agent: ${req.salesAgent.salesAgentName}`,
      notes: notes || `Status updated to ${status}${stockResult ? ` (Stock: ${stockResult.message})` : ''}`
    });

    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order,
      stockInfo: stockResult ? {
        stockUpdated: stockResult.success,
        stockMessage: stockResult.message,
        availableQuantity: stockResult.availableQuantity,
        reservedQuantity: stockResult.reservedQuantity
      } : null
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating order status', 
      error: error.message 
    });
  }
};

const confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const salesAgentId = req.salesAgent._id;

    // Find order and verify shop belongs to sales agent
    const order = await Order.findById(orderId).populate('shopId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify shop belongs to this sales agent
    if (order.shopId.salesAgentId.toString() !== salesAgentId.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. Order not in your shop.' 
      });
    }

    // Can only confirm pending orders
    if (order.orderStatus !== 'Pending') {
      return res.status(400).json({ 
        message: `Cannot confirm order with status: ${order.orderStatus}` 
      });
    }

    // Deduct stock when order is confirmed
    const stockResult = await StockManager.deductStock(
      order.orderDetails,
      order.shopId?._id,
      order.gasStockId,
      order._id
    );
    
    if (!stockResult.success) {
      return res.status(400).json({ 
        message: 'Cannot confirm order: ' + stockResult.message,
        error: 'Insufficient stock'
      });
    }

    // Update order to confirmed
    order.orderStatus = 'Confirmed';
    order.statusHistory.push({
      status: 'Confirmed',
      timestamp: new Date(),
      updatedBy: `Sales Agent: ${req.salesAgent.salesAgentName}`,
      notes: notes || `Order confirmed by sales agent (Stock: ${stockResult.message})`
    });

    await order.save();

    res.json({
      message: 'Order confirmed successfully',
      order,
      stockInfo: {
        stockUpdated: stockResult.success,
        stockMessage: stockResult.message,
        availableQuantity: stockResult.availableQuantity,
        reservedQuantity: stockResult.reservedQuantity
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error confirming order', 
      error: error.message 
    });
  }
};

const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const salesAgentId = req.salesAgent._id;

    // Find order and verify shop belongs to sales agent
    const order = await Order.findById(orderId).populate('shopId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify shop belongs to this sales agent
    if (order.shopId.salesAgentId.toString() !== salesAgentId.toString()) {
      return res.status(403).json({ 
        message: 'Access denied. Order not in your shop.' 
      });
    }

    // Can only reject pending orders
    if (order.orderStatus !== 'Pending') {
      return res.status(400).json({ 
        message: `Cannot reject order with status: ${order.orderStatus}` 
      });
    }

    // Update order to cancelled
    order.orderStatus = 'Cancelled';
    order.cancellationReason = reason;
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      updatedBy: `Sales Agent: ${req.salesAgent.salesAgentName}`,
      notes: `Order rejected: ${reason}`
    });

    await order.save();

    res.json({
      message: 'Order rejected successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error rejecting order', 
      error: error.message 
    });
  }
};

// Next Arrival Management Functions
const scheduleNextArrival = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { brandName, gasType, arrivalDate, expectedQuantity, notes } = req.body;
    const salesAgentId = req.salesAgent._id;

    // Verify shop belongs to this sales agent
    const shop = await Shop.findOne({ _id: shopId, salesAgentId });
    if (!shop) {
      return res.status(403).json({ 
        message: 'Access denied. Shop not assigned to you.' 
      });
    }

    // Get shop stock
    const shopStock = await ShopStock.findOne({ shopId });
    if (!shopStock) {
      return res.status(404).json({ message: 'Shop stock not found' });
    }

    // Schedule next arrival
    await shopStock.scheduleNextArrival(
      brandName, 
      gasType, 
      new Date(arrivalDate), 
      expectedQuantity, 
      salesAgentId, 
      notes
    );

    res.json({
      message: 'Next arrival scheduled successfully',
      shopStock
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error scheduling next arrival', 
      error: error.message 
    });
  }
};

const cancelNextArrival = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { brandName, gasType } = req.body;
    const salesAgentId = req.salesAgent._id;

    // Verify shop belongs to this sales agent
    const shop = await Shop.findOne({ _id: shopId, salesAgentId });
    if (!shop) {
      return res.status(403).json({ 
        message: 'Access denied. Shop not assigned to you.' 
      });
    }

    // Get shop stock
    const shopStock = await ShopStock.findOne({ shopId });
    if (!shopStock) {
      return res.status(404).json({ message: 'Shop stock not found' });
    }

    // Cancel next arrival
    await shopStock.cancelNextArrival(brandName, gasType, salesAgentId);

    res.json({
      message: 'Next arrival cancelled successfully',
      shopStock
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error cancelling next arrival', 
      error: error.message 
    });
  }
};

const getArrivalsSchedule = async (req, res) => {
  try {
    const { shopId } = req.params;
    const salesAgentId = req.salesAgent._id;

    // Verify shop belongs to this sales agent
    const shop = await Shop.findOne({ _id: shopId, salesAgentId });
    if (!shop) {
      return res.status(403).json({ 
        message: 'Access denied. Shop not assigned to you.' 
      });
    }

    // Get shop stock with next arrivals
    const shopStock = await ShopStock.findOne({ shopId });
    if (!shopStock) {
      return res.status(404).json({ message: 'Shop stock not found' });
    }

    // Filter stocks that have scheduled arrivals
    const scheduledArrivals = shopStock.gasStocks
      .filter(stock => 
        stock.nextArrival && 
        stock.nextArrival.status === 'scheduled' && 
        stock.nextArrival.arrivalDate
      )
      .map(stock => ({
        brandName: stock.brandName,
        gasType: stock.gasType,
        gasSize: stock.gasSize,
        currentQuantity: stock.availableQuantity,
        nextArrival: stock.nextArrival
      }));

    res.json({
      message: 'Arrivals schedule retrieved successfully',
      shop: {
        _id: shop._id,
        shopName: shop.shopName,
        shopCode: shop.shopCode
      },
      scheduledArrivals
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving arrivals schedule', 
      error: error.message 
    });
  }
};

// Manual trigger for arrival executions (for testing)
const triggerArrivalsNow = async (req, res) => {
  try {
    const salesAgentId = req.salesAgent._id;
    
    console.log(`Manual arrival trigger initiated by sales agent: ${salesAgentId}`);
    await stockScheduler.executeArrivalsNow();
    
    res.json({
      message: 'Arrival executions triggered successfully',
      status: stockScheduler.getStatus()
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error triggering arrivals', 
      error: error.message 
    });
  }
};

export {
  registerSalesAgent,
  getAllSalesAgent,
  getSalesAgentById,
  getAgentProfile,
  updateSalesAgent,
  deleteSalesAgent,
  getAssignedShops,
  updateShopStock,
  getShopStock,
  getStockHistory,
  bulkUpdateStock,
  createShop,
  getShopOrders,
  updateOrderStatus,
  confirmOrder,
  rejectOrder,
  scheduleNextArrival,
  cancelNextArrival,
  getArrivalsSchedule,
  triggerArrivalsNow
};
