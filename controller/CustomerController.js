import Customer from '../schema/Customer.js';
import GasStock from '../schema/GasStock.js';
import Price from '../schema/Price.js';
import Order from '../schema/Order.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Register Customer
const registerCustomer = async (req, res) => {
  const {
    customerName,
    customerAddress,
    customerMobileNumber,
    customerNationalId,
    email,
    password
  } = req.body;

  try {
    const exists = await Customer.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Customer already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
      customerName,
      customerAddress,
      customerMobileNumber,
      customerNationalId,
      email,
      password: hashedPassword
    });

    await customer.save();

    // Generate token for immediate login
    const token = jwt.sign(
      {
        id: customer._id,
        email: customer.email,
        role: customer.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({ 
      message: 'Customer registered successfully',
      token,
      user: {
        id: customer._id,
        email: customer.email,
        role: customer.role,
        name: customer.customerName,
        phone: customer.customerMobileNumber,
        preferences: customer.preferences || {}
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get all Customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Get Customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Update Customer
const updateCustomer = async (req, res) => {
  const { customerId, customerName, customerAddress, email, password } = req.body;

  try {
    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      { customerId, customerName, customerAddress, email, password },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer updated', customer: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete Customer
const deleteCustomer = async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted', customer: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Customer Login
const loginCustomer = async (req, res) => {
  const { email, password } = req.body;

  try {
    const customer = await Customer.findOne({ email, isActive: true });
    if (!customer) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, customer.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    const token = generateToken(customer);
    
    res.json({
      message: 'Login successful',
      token,
      customer: {
        id: customer._id,
        name: customer.customerName,
        email: customer.email,
        preferences: customer.preferences
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error during login', error: err.message });
  }
};

// Get nearby gas stations for customer
const getNearbyGasStations = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10, gasBrand, gasType } = req.query;
    const customerId = req.user?.id;

    let customer = null;
    if (customerId) {
      customer = await Customer.findById(customerId);
    }

    let query = {};
    
    // Apply filters
    if (gasBrand && gasBrand !== 'all') {
      query.gasBrand = gasBrand;
    }
    if (gasType && gasType !== 'all') {
      query.gasType = gasType;
    }

    let gasStations = await GasStock.find(query).populate('salesAgentId');

    // If location provided, calculate distances and filter
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const maxDist = parseFloat(maxDistance);

      gasStations = gasStations.filter(station => {
        const distance = calculateDistance(
          lat, lng,
          station.location.latitude,
          station.location.longitude
        );
        station._doc.distance = distance;
        return distance <= maxDist;
      }).sort((a, b) => a._doc.distance - b._doc.distance);
    }

    // Get current prices for each station
    const stationsWithPrices = await Promise.all(
      gasStations.map(async (station) => {
        const priceInfo = await Price.getCurrentPrice(station.gasBrand, station.gasType);
        return {
          ...station._doc,
          currentPrice: priceInfo?.finalPrice || null,
          priceInfo: priceInfo
        };
      })
    );

    res.json({
      stations: stationsWithPrices,
      count: stationsWithPrices.length,
      userLocation: latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching gas stations', error: err.message });
  }
};

// Get customer profile
const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.id)
      .populate('favoriteStations')
      .select('-password');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ customer });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
};

// Update customer profile
const updateCustomerProfile = async (req, res) => {
  try {
    const { customerName, customerAddress, customerMobileNumber, location, preferences } = req.body;
    
    const updateData = {
      customerName,
      customerAddress,
      customerMobileNumber,
      location,
      preferences
    };

    const customer = await Customer.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Profile updated successfully', customer });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
};

// Add station to favorites
const addToFavorites = async (req, res) => {
  try {
    const { stationId } = req.body;
    
    const customer = await Customer.findById(req.user.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.favoriteStations.includes(stationId)) {
      return res.status(400).json({ message: 'Station already in favorites' });
    }

    customer.favoriteStations.push(stationId);
    await customer.save();

    res.json({ message: 'Station added to favorites' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding to favorites', error: err.message });
  }
};

// Remove station from favorites
const removeFromFavorites = async (req, res) => {
  try {
    const { stationId } = req.params;
    
    const customer = await Customer.findByIdAndUpdate(
      req.user.id,
      { $pull: { favoriteStations: stationId } },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Station removed from favorites' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing from favorites', error: err.message });
  }
};

// Get customer's order history
const getOrderHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { customerId: req.user.id };
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('gasStockId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(query);

    res.json({
      orders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching order history', error: err.message });
  }
};

// Get current gas prices
const getCurrentPrices = async (req, res) => {
  try {
    const { gasBrand, gasType } = req.query;
    
    let query = { isActive: true };
    if (gasBrand && gasBrand !== 'all') {
      query.gasBrand = gasBrand;
    }
    if (gasType && gasType !== 'all') {
      query.gasType = gasType;
    }

    const prices = await Price.find(query)
      .sort({ gasBrand: 1, gasType: 1 });

    res.json({ prices });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching prices', error: err.message });
  }
};

// Utility function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

export {
  registerCustomer,
  loginCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getNearbyGasStations,
  getCustomerProfile,
  updateCustomerProfile,
  addToFavorites,
  removeFromFavorites,
  getOrderHistory,
  getCurrentPrices
};
