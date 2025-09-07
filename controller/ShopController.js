import Shop from '../schema/Shop.js';
import ShopStock from '../schema/ShopStock.js';
import SalesAgent from '../schema/SalesAgent.js';

const createShop = async (req, res) => {
  try {
    const {
      shopName,
      shopCode,
      address,
      location,
      contactInfo,
      operatingHours,
      salesAgentId,
      facilities,
      licenseNumber,
      licenseExpiry,
      notes
    } = req.body;

    const existingShop = await Shop.findOne({ 
      $or: [{ shopCode }, { licenseNumber }] 
    });
    
    if (existingShop) {
      return res.status(400).json({ 
        message: 'Shop with this code or license number already exists' 
      });
    }

    if (salesAgentId) {
      const agentExists = await SalesAgent.findById(salesAgentId);
      if (!agentExists) {
        return res.status(404).json({ 
          message: 'Sales Agent not found' 
        });
      }
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
      salesAgentId,
      facilities,
      licenseNumber,
      licenseExpiry,
      notes
    });

    await newShop.save();

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
      }))
    });

    await shopStock.save();

    const populatedShop = await Shop.findById(newShop._id)
      .populate('salesAgentId', 'salesAgentName salesAgentEmail');

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

const getAllShops = async (req, res) => {
  try {
    const { 
      status, 
      city, 
      district, 
      salesAgentId,
      includeStock 
    } = req.query;

    let query = {};
    
    if (status) query.status = status;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (district) query['address.district'] = new RegExp(district, 'i');
    if (salesAgentId) query.salesAgentId = salesAgentId;

    const shops = await Shop.find(query)
      .populate('salesAgentId', 'salesAgentName salesAgentEmail salesAgentGasBrandName')
      .sort({ createdAt: -1 });

    if (includeStock === 'true') {
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
      return res.json(shopsWithStock);
    }

    res.json(shops);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching shops', 
      error: error.message 
    });
  }
};

const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('salesAgentId', 'salesAgentName salesAgentEmail salesAgentGasBrandName');

    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }

    const stock = await ShopStock.findOne({ shopId: shop._id });

    res.json({
      shop,
      stock: stock || null
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching shop', 
      error: error.message 
    });
  }
};

const updateShop = async (req, res) => {
  try {
    const {
      shopName,
      address,
      location,
      contactInfo,
      operatingHours,
      salesAgentId,
      status,
      facilities,
      licenseExpiry,
      notes
    } = req.body;

    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }

    if (salesAgentId && salesAgentId !== shop.salesAgentId?.toString()) {
      const agentExists = await SalesAgent.findById(salesAgentId);
      if (!agentExists) {
        return res.status(404).json({ 
          message: 'Sales Agent not found' 
        });
      }
    }

    if (shopName) shop.shopName = shopName;
    if (address) shop.address = { ...shop.address, ...address };
    if (location) shop.location = location;
    if (contactInfo) shop.contactInfo = { ...shop.contactInfo, ...contactInfo };
    if (operatingHours) shop.operatingHours = { ...shop.operatingHours, ...operatingHours };
    if (salesAgentId !== undefined) shop.salesAgentId = salesAgentId;
    if (status) shop.status = status;
    if (facilities) shop.facilities = { ...shop.facilities, ...facilities };
    if (licenseExpiry) shop.licenseExpiry = licenseExpiry;
    if (notes !== undefined) shop.notes = notes;

    await shop.save();

    const updatedShop = await Shop.findById(shop._id)
      .populate('salesAgentId', 'salesAgentName salesAgentEmail');

    res.json({
      message: 'Shop updated successfully',
      shop: updatedShop
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating shop', 
      error: error.message 
    });
  }
};

const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }

    await ShopStock.deleteOne({ shopId: shop._id });

    await shop.deleteOne();

    res.json({
      message: 'Shop and associated stock deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting shop', 
      error: error.message 
    });
  }
};

const assignSalesAgent = async (req, res) => {
  try {
    const { shopId, salesAgentId } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }

    if (salesAgentId) {
      const agent = await SalesAgent.findById(salesAgentId);
      if (!agent) {
        return res.status(404).json({ 
          message: 'Sales Agent not found' 
        });
      }
    }

    shop.salesAgentId = salesAgentId || null;
    await shop.save();

    const updatedShop = await Shop.findById(shop._id)
      .populate('salesAgentId', 'salesAgentName salesAgentEmail');

    res.json({
      message: salesAgentId 
        ? 'Sales Agent assigned successfully' 
        : 'Sales Agent removed from shop',
      shop: updatedShop
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error assigning sales agent', 
      error: error.message 
    });
  }
};

const getNearbyShops = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, gasType, brandName } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Latitude and longitude are required' 
      });
    }

    const radiusInRadians = parseFloat(radius) / 6371;

    let shops = await Shop.find({
      status: 'active',
      location: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(longitude), parseFloat(latitude)],
            radiusInRadians
          ]
        }
      }
    }).populate('salesAgentId', 'salesAgentName salesAgentEmail');

    const shopsWithStock = await Promise.all(
      shops.map(async (shop) => {
        const stock = await ShopStock.findOne({ shopId: shop._id });
        
        let hasRequestedStock = true;
        if (stock && (gasType || brandName)) {
          hasRequestedStock = stock.gasStocks.some(s => {
            const typeMatch = !gasType || s.gasType === gasType;
            const brandMatch = !brandName || s.brandName === brandName;
            return typeMatch && brandMatch && s.availableQuantity > 0;
          });
        }

        if (!hasRequestedStock) return null;

        const R = 6371;
        const dLat = (shop.location.latitude - parseFloat(latitude)) * Math.PI / 180;
        const dLon = (shop.location.longitude - parseFloat(longitude)) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(parseFloat(latitude) * Math.PI / 180) * 
          Math.cos(shop.location.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return {
          ...shop.toObject(),
          distance: Math.round(distance * 100) / 100,
          stock: stock || null,
          isOpen: shop.isOpen
        };
      })
    );

    const filteredShops = shopsWithStock
      .filter(shop => shop !== null)
      .sort((a, b) => a.distance - b.distance);

    res.json(filteredShops);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching nearby shops', 
      error: error.message 
    });
  }
};

const updateShopStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'maintenance', 'closed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('salesAgentId', 'salesAgentName salesAgentEmail');

    if (!shop) {
      return res.status(404).json({ 
        message: 'Shop not found' 
      });
    }

    res.json({
      message: 'Shop status updated successfully',
      shop
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating shop status', 
      error: error.message 
    });
  }
};

export {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  assignSalesAgent,
  getNearbyShops,
  updateShopStatus
};