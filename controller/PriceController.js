import Price from '../schema/Price.js';

// Get all prices
const getAllPrices = async (req, res) => {
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
      .sort({ gasBrand: 1, gasType: 1 })
      .select('-priceHistory');

    res.json({
      message: 'Prices retrieved successfully',
      prices: prices,
      count: prices.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving prices', 
      error: error.message 
    });
  }
};

// Get price by ID
const getPriceById = async (req, res) => {
  try {
    const { id } = req.params;
    const price = await Price.findById(id);
    
    if (!price) {
      return res.status(404).json({ 
        message: 'Price not found' 
      });
    }

    res.json({
      message: 'Price retrieved successfully',
      price: price
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving price', 
      error: error.message 
    });
  }
};

// Create new price (Admin only)
const createPrice = async (req, res) => {
  try {
    const { 
      gasBrand, 
      gasType, 
      basePrice, 
      currentPrice, 
      discountPercentage,
      effectiveFrom,
      effectiveUntil,
      priceType 
    } = req.body;

    // Check if price already exists for this brand and type
    const existingPrice = await Price.findOne({ 
      gasBrand, 
      gasType, 
      isActive: true 
    });

    if (existingPrice) {
      return res.status(400).json({ 
        message: `Price already exists for ${gasBrand} ${gasType}` 
      });
    }

    const newPrice = new Price({
      gasBrand,
      gasType,
      basePrice,
      currentPrice: currentPrice || basePrice,
      discountPercentage: discountPercentage || 0,
      effectiveFrom: effectiveFrom || new Date(),
      effectiveUntil,
      priceType: priceType || 'Standard',
      lastUpdatedBy: req.user?.id || 'admin',
      priceHistory: [{
        price: currentPrice || basePrice,
        effectiveDate: new Date(),
        reason: 'Initial price creation',
        updatedBy: req.user?.id || 'admin'
      }]
    });

    await newPrice.save();

    res.status(201).json({
      message: 'Price created successfully',
      price: newPrice
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating price', 
      error: error.message 
    });
  }
};

// Update price (Admin only)
const updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      basePrice, 
      currentPrice, 
      discountPercentage,
      effectiveUntil,
      priceType,
      reason 
    } = req.body;

    const price = await Price.findById(id);
    if (!price) {
      return res.status(404).json({ 
        message: 'Price not found' 
      });
    }

    // Update fields if provided
    if (basePrice !== undefined) price.basePrice = basePrice;
    if (currentPrice !== undefined) price.currentPrice = currentPrice;
    if (discountPercentage !== undefined) price.discountPercentage = discountPercentage;
    if (effectiveUntil !== undefined) price.effectiveUntil = effectiveUntil;
    if (priceType !== undefined) price.priceType = priceType;
    
    price.lastUpdatedBy = req.user?.id || 'admin';

    // Add to price history if current price changed
    if (currentPrice !== undefined && currentPrice !== price.currentPrice) {
      price.priceHistory.push({
        price: currentPrice,
        effectiveDate: new Date(),
        reason: reason || 'Price update',
        updatedBy: req.user?.id || 'admin'
      });
    }

    await price.save();

    res.json({
      message: 'Price updated successfully',
      price: price
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating price', 
      error: error.message 
    });
  }
};

// Delete price (Admin only)
const deletePrice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const price = await Price.findById(id);
    if (!price) {
      return res.status(404).json({ 
        message: 'Price not found' 
      });
    }

    // Soft delete by marking as inactive
    price.isActive = false;
    price.lastUpdatedBy = req.user?.id || 'admin';
    await price.save();

    res.json({
      message: 'Price deleted successfully',
      price: price
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting price', 
      error: error.message 
    });
  }
};

// Get current effective prices for customers
const getCurrentPrices = async (req, res) => {
  try {
    const { gasBrand, gasType, region, quantity = 1 } = req.query;
    
    let query = {
      isActive: true,
      effectiveFrom: { $lte: new Date() }
    };
    
    // Add effectiveUntil check
    query.$or = [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: { $gte: new Date() } }
    ];

    if (gasBrand && gasBrand !== 'all') {
      query.gasBrand = gasBrand;
    }
    if (gasType && gasType !== 'all') {
      query.gasType = gasType;
    }

    const prices = await Price.find(query)
      .select('-priceHistory')
      .sort({ gasBrand: 1, gasType: 1 });

    // Calculate final prices with discounts
    const processedPrices = prices.map(price => {
      let finalPrice = price.currentPrice;
      
      // Apply general discount
      if (price.discountPercentage > 0) {
        finalPrice *= (1 - price.discountPercentage / 100);
      }
      
      return {
        id: price._id,
        gasBrand: price.gasBrand,
        gasType: price.gasType,
        basePrice: price.basePrice,
        currentPrice: price.currentPrice,
        finalPrice: Math.round(finalPrice * 100) / 100,
        discountApplied: price.discountPercentage,
        priceType: price.priceType,
        effectiveFrom: price.effectiveFrom,
        effectiveUntil: price.effectiveUntil
      };
    });

    res.json({
      message: 'Current prices retrieved successfully',
      prices: processedPrices,
      count: processedPrices.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving current prices', 
      error: error.message 
    });
  }
};

// Initialize default prices (Admin utility)
const initializeDefaultPrices = async (req, res) => {
  try {
    const defaultPrices = [
      { gasBrand: 'Laugfs', gasType: '2.3kg', basePrice: 800, currentPrice: 800 },
      { gasBrand: 'Laugfs', gasType: '5kg', basePrice: 1700, currentPrice: 1700 },
      { gasBrand: 'Laugfs', gasType: '12.5kg', basePrice: 4200, currentPrice: 4200 },
      { gasBrand: 'Litro', gasType: '2.3kg', basePrice: 780, currentPrice: 780 },
      { gasBrand: 'Litro', gasType: '5kg', basePrice: 1650, currentPrice: 1650 },
      { gasBrand: 'Litro', gasType: '12.5kg', basePrice: 4100, currentPrice: 4100 },
    ];

    const createdPrices = [];
    const skippedPrices = [];

    for (const priceData of defaultPrices) {
      const existingPrice = await Price.findOne({ 
        gasBrand: priceData.gasBrand, 
        gasType: priceData.gasType, 
        isActive: true 
      });

      if (existingPrice) {
        skippedPrices.push(`${priceData.gasBrand} ${priceData.gasType}`);
        continue;
      }

      const newPrice = new Price({
        ...priceData,
        lastUpdatedBy: req.user?.id || 'system',
        priceHistory: [{
          price: priceData.currentPrice,
          effectiveDate: new Date(),
          reason: 'System initialization',
          updatedBy: req.user?.id || 'system'
        }]
      });

      await newPrice.save();
      createdPrices.push(`${priceData.gasBrand} ${priceData.gasType}`);
    }

    res.json({
      message: 'Default prices initialization completed',
      created: createdPrices,
      skipped: skippedPrices,
      summary: {
        total: defaultPrices.length,
        created: createdPrices.length,
        skipped: skippedPrices.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error initializing default prices', 
      error: error.message 
    });
  }
};

export {
  getAllPrices,
  getPriceById,
  createPrice,
  updatePrice,
  deletePrice,
  getCurrentPrices,
  initializeDefaultPrices
};