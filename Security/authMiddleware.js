import jwt from 'jsonwebtoken';
import Customer from '../schema/Customer.js';
import SalesAgent from '../schema/SalesAgent.js';
import Admin from '../schema/Admin.js';

// Generic JWT verification middleware
export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ 
      message: 'Access denied. No token provided.',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    }
    return res.status(401).json({ 
      message: 'Token verification failed.',
      code: 'TOKEN_ERROR'
    });
  }
};

// Customer-specific middleware
export const verifyCustomer = async (req, res, next) => {
  try {
    await verifyToken(req, res, async () => {
      if (req.user.role !== 'customer') {
        return res.status(403).json({ 
          message: 'Access denied. Customer role required.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Verify customer still exists and is active
      const customer = await Customer.findById(req.user.id);
      if (!customer || !customer.isActive) {
        return res.status(401).json({ 
          message: 'Customer account not found or inactive.',
          code: 'INVALID_CUSTOMER'
        });
      }

      req.customer = customer;
      next();
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'Authentication error.',
      code: 'AUTH_ERROR'
    });
  }
};

// Sales Agent middleware
export const verifySalesAgent = async (req, res, next) => {
  try {
    await verifyToken(req, res, async () => {
      if (req.user.role !== 'salesAgent' && req.user.role !== 'salesagent') {
        return res.status(403).json({ 
          message: 'Access denied. Sales Agent role required.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      const salesAgent = await SalesAgent.findById(req.user.id);
      if (!salesAgent) {
        return res.status(401).json({ 
          message: 'Sales Agent account not found.',
          code: 'INVALID_SALES_AGENT'
        });
      }

      // Check if sales agent is approved
      if (salesAgent.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          message: `Access denied. Your account is ${salesAgent.approvalStatus}. Please wait for admin approval.`,
          code: 'ACCOUNT_NOT_APPROVED',
          approvalStatus: salesAgent.approvalStatus
        });
      }

      req.salesAgent = salesAgent;
      next();
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'Authentication error.',
      code: 'AUTH_ERROR'
    });
  }
};

// Admin middleware
export const verifyAdmin = async (req, res, next) => {
  try {
    await verifyToken(req, res, async () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. Admin role required.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      const admin = await Admin.findById(req.user.id);
      if (!admin) {
        return res.status(401).json({ 
          message: 'Admin account not found.',
          code: 'INVALID_ADMIN'
        });
      }

      req.admin = admin;
      next();
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'Authentication error.',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware (for public routes that can be enhanced with user info)
export const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }
  
  next();
};

// Utility function to generate JWT token
export const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'gas-tracking-system',
      audience: 'gas-tracking-users'
    }
  );
};

// Utility function to refresh token
export const refreshToken = (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', { ignoreExpiration: true });
    
    const newToken = generateToken(decoded);
    
    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  } catch (error) {
    res.status(401).json({ 
      message: 'Unable to refresh token. Please log in again.',
      code: 'REFRESH_FAILED'
    });
  }
};