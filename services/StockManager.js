import ShopStock from '../schema/ShopStock.js';
import GasStock from '../schema/GasStock.js';

/**
 * StockManager - Centralized service for managing stock operations
 * Handles both new ShopStock and legacy GasStock systems
 */
class StockManager {
  
  /**
   * Convert gas type between different formats
   * Handles conversion between weight format (2.3kg, 5kg, 12.5kg) and size format (Small, Medium, Large)
   */
  convertGasType(gasType) {
    // Normalize the input
    const normalizedType = gasType?.toString().toLowerCase().trim();
    
    // Weight to Size mapping
    const weightToSize = {
      '2.3kg': 'Small',
      '2.3': 'Small',
      'small': 'Small',
      '5kg': 'Medium',
      '5': 'Medium',
      'medium': 'Medium',
      '12.5kg': 'Large',
      '12.5': 'Large',
      'large': 'Large'
    };
    
    // Size to Weight mapping
    const sizeToWeight = {
      'small': '2.3kg',
      'medium': '5kg',
      'large': '12.5kg'
    };
    
    // Try to find the converted format
    const converted = weightToSize[normalizedType];
    if (converted) return converted;
    
    // If already in correct format, return as is with proper casing
    if (normalizedType === 'small') return 'Small';
    if (normalizedType === 'medium') return 'Medium';
    if (normalizedType === 'large') return 'Large';
    
    // Return original if no conversion found
    return gasType;
  }
  
  /**
   * Find gas stock with flexible type matching
   */
  findGasStock(gasStocks, gasBrand, gasType) {
    if (!gasStocks || !Array.isArray(gasStocks)) return null;
    
    // First try direct match
    let gasStock = gasStocks.find(stock => 
      stock.brandName === gasBrand && stock.gasType === gasType
    );
    
    if (gasStock) return gasStock;
    
    // Try with converted gas type
    const convertedType = this.convertGasType(gasType);
    gasStock = gasStocks.find(stock => 
      stock.brandName === gasBrand && stock.gasType === convertedType
    );
    
    if (gasStock) return gasStock;
    
    // Try case-insensitive match
    gasStock = gasStocks.find(stock => 
      stock.brandName?.toLowerCase() === gasBrand?.toLowerCase() && 
      stock.gasType?.toLowerCase() === convertedType?.toLowerCase()
    );
    
    return gasStock;
  }
  
  /**
   * Reserve stock for paid orders (immediate payment)
   * @param {Object} orderDetails - Order details containing gas type, brand, quantity
   * @param {String} shopId - Shop ID (optional, for new system)
   * @param {String} gasStockId - GasStock ID (optional, for legacy system)
   * @param {String} orderId - Order ID for tracking
   */
  async reserveStock(orderDetails, shopId = null, gasStockId = null, orderId) {
    try {
      const { gasBrand, gasType, quantity } = orderDetails;
      
      if (shopId) {
        // New ShopStock system
        const shopStock = await ShopStock.findOne({ shopId });
        if (!shopStock) {
          throw new Error('Shop stock not found');
        }

        const gasStock = this.findGasStock(shopStock.gasStocks, gasBrand, gasType);

        if (!gasStock) {
          const availableTypes = shopStock.gasStocks
            .filter(s => s.brandName === gasBrand)
            .map(s => s.gasType)
            .join(', ');
          throw new Error(`Gas stock not found for ${gasBrand} ${gasType}. Available types: ${availableTypes || 'none'}`);
        }

        if (gasStock.availableQuantity < quantity) {
          throw new Error(`Insufficient stock. Available: ${gasStock.availableQuantity}, Requested: ${quantity}`);
        }

        // Reserve stock by moving from available to reserved
        gasStock.availableQuantity -= quantity;
        gasStock.reservedQuantity += quantity;

        // Add to stock history
        shopStock.stockHistory.push({
          brandName: gasBrand,
          gasType: gasType,
          action: 'reserved',
          quantity: quantity,
          previousQuantity: gasStock.availableQuantity + quantity,
          newQuantity: gasStock.availableQuantity,
          updatedBy: `Order: ${orderId}`,
          reason: `Stock reserved for order payment`,
          timestamp: new Date()
        });

        await shopStock.save();
        
        return {
          success: true,
          message: 'Stock reserved successfully',
          availableQuantity: gasStock.availableQuantity,
          reservedQuantity: gasStock.reservedQuantity
        };

      } else if (gasStockId) {
        // Legacy GasStock system
        const gasStock = await GasStock.findById(gasStockId);
        if (!gasStock) {
          throw new Error('Gas stock not found');
        }

        if (gasStock.gasAvailableQty < quantity) {
          throw new Error(`Insufficient stock. Available: ${gasStock.gasAvailableQty}, Requested: ${quantity}`);
        }

        // For legacy system, immediately deduct (no reservation concept)
        gasStock.gasAvailableQty -= quantity;
        await gasStock.save();

        return {
          success: true,
          message: 'Stock reserved (legacy system)',
          availableQuantity: gasStock.gasAvailableQty
        };
      }

    } catch (error) {
      console.error('Error reserving stock:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Deduct stock when order is confirmed by sales agent
   * @param {Object} orderDetails - Order details
   * @param {String} shopId - Shop ID
   * @param {String} gasStockId - GasStock ID (legacy)
   * @param {String} orderId - Order ID
   */
  async deductStock(orderDetails, shopId = null, gasStockId = null, orderId) {
    try {
      const { gasBrand, gasType, quantity } = orderDetails;
      
      if (shopId) {
        // New ShopStock system
        const shopStock = await ShopStock.findOne({ shopId });
        if (!shopStock) {
          throw new Error('Shop stock not found');
        }

        const gasStock = this.findGasStock(shopStock.gasStocks, gasBrand, gasType);

        if (!gasStock) {
          const availableTypes = shopStock.gasStocks
            .filter(s => s.brandName === gasBrand)
            .map(s => s.gasType)
            .join(', ');
          throw new Error(`Gas stock not found for ${gasBrand} ${gasType}. Available types: ${availableTypes || 'none'}`);
        }

        // Check if stock was reserved (paid order) or needs deduction from available (COD)
        if (gasStock.reservedQuantity >= quantity) {
          // Stock was reserved, move from reserved to sold
          gasStock.reservedQuantity -= quantity;
        } else {
          // COD order, deduct from available quantity
          if (gasStock.availableQuantity < quantity) {
            throw new Error(`Insufficient stock. Available: ${gasStock.availableQuantity}, Requested: ${quantity}`);
          }
          gasStock.availableQuantity -= quantity;
        }

        // Add to stock history
        shopStock.stockHistory.push({
          brandName: gasBrand,
          gasType: gasType,
          action: 'sale',
          quantity: quantity,
          previousQuantity: gasStock.availableQuantity + (gasStock.reservedQuantity > 0 ? 0 : quantity),
          newQuantity: gasStock.availableQuantity,
          updatedBy: `Order: ${orderId}`,
          reason: `Stock deducted for confirmed order`,
          timestamp: new Date()
        });

        await shopStock.save();
        
        return {
          success: true,
          message: 'Stock deducted successfully',
          availableQuantity: gasStock.availableQuantity,
          reservedQuantity: gasStock.reservedQuantity
        };

      } else if (gasStockId) {
        // Legacy system - stock already deducted during reservation/creation
        return {
          success: true,
          message: 'Stock already handled (legacy system)'
        };
      }

    } catch (error) {
      console.error('Error deducting stock:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Restore stock for cancelled or returned orders
   * @param {Object} orderDetails - Order details
   * @param {String} shopId - Shop ID
   * @param {String} gasStockId - GasStock ID (legacy)
   * @param {String} orderId - Order ID
   * @param {String} reason - Reason for stock restoration
   */
  async restoreStock(orderDetails, shopId = null, gasStockId = null, orderId, reason = 'Order cancelled') {
    try {
      const { gasBrand, gasType, quantity } = orderDetails;
      
      if (shopId) {
        // New ShopStock system
        const shopStock = await ShopStock.findOne({ shopId });
        if (!shopStock) {
          throw new Error('Shop stock not found');
        }

        const gasStock = this.findGasStock(shopStock.gasStocks, gasBrand, gasType);

        if (!gasStock) {
          const availableTypes = shopStock.gasStocks
            .filter(s => s.brandName === gasBrand)
            .map(s => s.gasType)
            .join(', ');
          throw new Error(`Gas stock not found for ${gasBrand} ${gasType}. Available types: ${availableTypes || 'none'}`);
        }

        // Restore stock to available quantity
        gasStock.availableQuantity += quantity;
        
        // If there was reserved quantity, reduce it
        if (gasStock.reservedQuantity >= quantity) {
          gasStock.reservedQuantity -= quantity;
        }

        // Add to stock history
        const action = reason.toLowerCase().includes('return') ? 'return' : 'cancellation';
        shopStock.stockHistory.push({
          brandName: gasBrand,
          gasType: gasType,
          action: action,
          quantity: quantity,
          previousQuantity: gasStock.availableQuantity - quantity,
          newQuantity: gasStock.availableQuantity,
          updatedBy: `Order: ${orderId}`,
          reason: reason,
          timestamp: new Date()
        });

        await shopStock.save();
        
        return {
          success: true,
          message: 'Stock restored successfully',
          availableQuantity: gasStock.availableQuantity,
          reservedQuantity: gasStock.reservedQuantity
        };

      } else if (gasStockId) {
        // Legacy GasStock system
        const gasStock = await GasStock.findById(gasStockId);
        if (!gasStock) {
          throw new Error('Gas stock not found');
        }

        gasStock.gasAvailableQty += quantity;
        await gasStock.save();

        return {
          success: true,
          message: 'Stock restored (legacy system)',
          availableQuantity: gasStock.gasAvailableQty
        };
      }

    } catch (error) {
      console.error('Error restoring stock:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Get available stock considering reservations
   * @param {String} shopId - Shop ID
   * @param {String} gasBrand - Gas brand
   * @param {String} gasType - Gas type
   */
  async getAvailableStock(shopId, gasBrand, gasType) {
    try {
      if (shopId) {
        const shopStock = await ShopStock.findOne({ shopId });
        if (!shopStock) {
          return { success: false, message: 'Shop stock not found' };
        }

        const gasStock = this.findGasStock(shopStock.gasStocks, gasBrand, gasType);

        if (!gasStock) {
          return { success: false, message: 'Gas stock not found' };
        }

        return {
          success: true,
          availableQuantity: gasStock.availableQuantity,
          reservedQuantity: gasStock.reservedQuantity,
          totalQuantity: gasStock.availableQuantity + gasStock.reservedQuantity
        };
      }
    } catch (error) {
      console.error('Error getting available stock:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Check if sufficient stock is available for an order
   * @param {Object} orderDetails - Order details
   * @param {String} shopId - Shop ID
   * @param {String} gasStockId - GasStock ID (legacy)
   */
  async checkStockAvailability(orderDetails, shopId = null, gasStockId = null) {
    try {
      const { gasBrand, gasType, quantity } = orderDetails;
      
      if (shopId) {
        // Convert gas type to ensure compatibility
        const convertedType = this.convertGasType(gasType);
        const stockInfo = await this.getAvailableStock(shopId, gasBrand, convertedType);
        if (!stockInfo.success) {
          return stockInfo;
        }

        return {
          success: true,
          available: stockInfo.availableQuantity >= quantity,
          availableQuantity: stockInfo.availableQuantity,
          requestedQuantity: quantity,
          shortage: Math.max(0, quantity - stockInfo.availableQuantity)
        };

      } else if (gasStockId) {
        // Legacy system check
        const gasStock = await GasStock.findById(gasStockId);
        if (!gasStock) {
          return { success: false, message: 'Gas stock not found' };
        }

        return {
          success: true,
          available: gasStock.gasAvailableQty >= quantity,
          availableQuantity: gasStock.gasAvailableQty,
          requestedQuantity: quantity,
          shortage: Math.max(0, quantity - gasStock.gasAvailableQty)
        };
      }

    } catch (error) {
      console.error('Error checking stock availability:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }
}

export default new StockManager();