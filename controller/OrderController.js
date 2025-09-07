import Order from '../schema/Order.js';
import GasStock from '../schema/GasStock.js';
import Price from '../schema/Price.js';
import Customer from '../schema/Customer.js';
import Delivery from '../schema/Delivery.js';
import StockManager from '../services/StockManager.js';

// Create a new order
const createOrder = async (req, res) => {
  try {
    const {
      shopId,
      gasStockId,
      orderDetails,
      deliveryInfo,
      paymentInfo,
      quantity = 1,
      deliveryAddress,
      contactNumber,
      preferredDeliveryDate,
      deliveryInstructions,
      paymentMethod = 'Cash on Delivery'
    } = req.body;

    const customerId = req.user.id;

    // Support both new shop-based orders and legacy gasStock orders
    let finalOrderDetails, finalDeliveryInfo, finalPaymentInfo, finalShopId, finalGasStockId;

    if (orderDetails && deliveryInfo && paymentInfo) {
      // New shop-based order format
      finalOrderDetails = orderDetails;
      finalDeliveryInfo = {
        ...deliveryInfo,
        preferredDeliveryDate: new Date(deliveryInfo.preferredDeliveryDate)
      };
      finalPaymentInfo = {
        paymentMethod: paymentInfo.paymentMethod || 'Cash on Delivery',
        paymentStatus: paymentInfo.paymentStatus || 'Pending',
        transactionId: paymentInfo.transactionId
      };
      finalShopId = shopId;
      finalGasStockId = gasStockId;

      // Validate shop exists if shopId provided
      if (shopId) {
        const Shop = await import('../schema/Shop.js').then(m => m.default);
        const shop = await Shop.findById(shopId);
        if (!shop) {
          return res.status(404).json({ message: 'Shop not found' });
        }
      }
    } else {
      // Legacy gasStock-based order format
      finalGasStockId = gasStockId;
      
      // Validate gas stock availability
      const gasStock = await GasStock.findById(gasStockId);
      if (!gasStock) {
        return res.status(404).json({ message: 'Gas stock not found' });
      }

      if (gasStock.gasAvailableQty < quantity) {
        return res.status(400).json({ 
          message: 'Insufficient stock available',
          availableQuantity: gasStock.gasAvailableQty,
          requestedQuantity: quantity
        });
      }

      // Get current price for legacy orders
      const priceInfo = await Price.getCurrentPrice(gasStock.gasBrand, gasStock.gasType, null, quantity);
      if (!priceInfo) {
        return res.status(400).json({ message: 'Price not available for this gas type' });
      }

      const totalPrice = priceInfo.finalPrice * quantity;

      finalOrderDetails = {
        gasType: gasStock.gasType,
        gasBrand: gasStock.gasBrand,
        quantity,
        unitPrice: priceInfo.finalPrice,
        totalPrice
      };

      finalDeliveryInfo = {
        deliveryAddress,
        contactNumber,
        preferredDeliveryDate: new Date(preferredDeliveryDate),
        deliveryInstructions
      };

      finalPaymentInfo = {
        paymentMethod,
        paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Pending'
      };

      // Update gas stock quantity for legacy orders
      gasStock.gasAvailableQty -= quantity;
      await gasStock.save();
    }

    // Create order
    const newOrder = new Order({
      customerId,
      shopId: finalShopId,
      gasStockId: finalGasStockId,
      orderDetails: finalOrderDetails,
      deliveryInfo: finalDeliveryInfo,
      paymentInfo: finalPaymentInfo,
      orderStatus: 'Pending',
      estimatedDeliveryTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours
    });

    await newOrder.save();

    // Handle stock management for paid orders (immediate reservation)
    if (finalPaymentInfo.paymentStatus === 'Paid') {
      const stockResult = await StockManager.reserveStock(
        finalOrderDetails,
        finalShopId,
        finalGasStockId,
        newOrder._id
      );
      
      if (!stockResult.success) {
        // If stock reservation fails, cancel the order and restore any legacy stock changes
        if (finalGasStockId && !finalShopId) {
          const gasStock = await GasStock.findById(finalGasStockId);
          if (gasStock) {
            gasStock.gasAvailableQty += finalOrderDetails.quantity;
            await gasStock.save();
          }
        }
        
        await Order.findByIdAndDelete(newOrder._id);
        return res.status(400).json({ 
          message: 'Order cancelled: ' + stockResult.message,
          error: 'Insufficient stock for paid order'
        });
      }
    }

    // Populate order details for response
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('customerId', 'customerName customerMobileNumber')
      .populate('shopId', 'shopName address contactInfo')
      .populate('gasStockId');

    res.status(201).json({
      message: 'Order created successfully',
      order: populatedOrder,
      orderNumber: newOrder.orderNumber
    });

  } catch (err) {
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;

    const order = await Order.findOne({ _id: orderId, customerId })
      .populate('customerId', 'customerName customerMobileNumber customerAddress')
      .populate('gasStockId')
      .populate('assignedDelivery');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching order', error: err.message });
  }
};

// Get customer's orders
const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    let query = { customerId };
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(query)
      .populate('gasStockId', 'gasCenterName gasBrand gasType location')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(query);

    res.json({
      orders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      hasNextPage: page < Math.ceil(totalOrders / limit),
      hasPrevPage: page > 1
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching orders', error: err.message });
  }
};

// Update order status (for customers - limited actions)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, reason } = req.body; // action: 'cancel'
    const customerId = req.user.id;

    const order = await Order.findOne({ _id: orderId, customerId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    switch (action) {
      case 'cancel':
        if (!['Pending', 'Confirmed'].includes(order.orderStatus)) {
          return res.status(400).json({ 
            message: 'Order cannot be cancelled at this stage',
            currentStatus: order.orderStatus
          });
        }

        order.orderStatus = 'Cancelled';
        order.cancellationReason = reason || 'Cancelled by customer';

        // Restore stock using StockManager
        const stockResult = await StockManager.restoreStock(
          order.orderDetails,
          order.shopId,
          order.gasStockId,
          order._id,
          `Order cancelled by customer: ${reason || 'No reason provided'}`
        );

        if (!stockResult.success) {
          console.error('Failed to restore stock for cancelled order:', stockResult.message);
          // Continue with cancellation but log the error
        }

        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    await order.save();

    res.json({ message: `Order ${action}ed successfully`, order });
  } catch (err) {
    res.status(500).json({ message: `Error ${req.body.action}ing order`, error: err.message });
  }
};

// Rate and review order
const rateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, review } = req.body;
    const customerId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const order = await Order.findOne({ 
      _id: orderId, 
      customerId, 
      orderStatus: 'Delivered' 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not eligible for rating' });
    }

    if (order.customerRating.rating) {
      return res.status(400).json({ message: 'Order already rated' });
    }

    order.customerRating = {
      rating,
      review: review || '',
      ratedAt: new Date()
    };

    await order.save();

    res.json({ message: 'Order rated successfully', order });
  } catch (err) {
    res.status(500).json({ message: 'Error rating order', error: err.message });
  }
};

// Get order tracking information
const trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const customerId = req.user?.id; // Optional for public tracking

    let query = { orderNumber };
    if (customerId) {
      query.customerId = customerId;
    }

    const order = await Order.findOne(query)
      .populate('gasStockId', 'gasCenterName location')
      .populate('assignedDelivery')
      .select('orderNumber orderStatus statusHistory estimatedDeliveryTime actualDeliveryTime orderDetails deliveryInfo');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Calculate delivery progress
    const statusSteps = ['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order.orderStatus);
    const progress = order.orderStatus === 'Cancelled' ? 0 : ((currentStepIndex + 1) / statusSteps.length) * 100;

    res.json({
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      progress: Math.round(progress),
      statusHistory: order.statusHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      estimatedDelivery: order.estimatedDeliveryTime,
      actualDelivery: order.actualDeliveryTime,
      orderDetails: order.orderDetails,
      gasStation: order.gasStockId
    });
  } catch (err) {
    res.status(500).json({ message: 'Error tracking order', error: err.message });
  }
};

// Get order summary/statistics for customer
const getOrderSummary = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    const summary = await Order.aggregate([
      { $match: { customerId: customerId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$orderDetails.totalPrice' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $in: ['$orderStatus', ['Pending', 'Confirmed', 'Processing', 'Out for Delivery']] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const recentOrders = await Order.find({ customerId })
      .populate('gasStockId', 'gasCenterName gasBrand gasType')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      summary: summary[0] || {
        totalOrders: 0,
        totalSpent: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0
      },
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching order summary', error: err.message });
  }
};

export {
  createOrder,
  getOrderById,
  getCustomerOrders,
  updateOrderStatus,
  rateOrder,
  trackOrder,
  getOrderSummary
};