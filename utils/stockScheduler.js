import ShopStock from '../schema/ShopStock.js';

class StockScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start the scheduler to run every hour
  start() {
    if (this.isRunning) {
      console.log('Stock scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting stock scheduler...');
    
    // Run immediately once
    this.checkAndExecuteArrivals();
    
    // Then run every hour (3600000 ms)
    this.intervalId = setInterval(() => {
      this.checkAndExecuteArrivals();
    }, 3600000); // 1 hour
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Stock scheduler stopped');
  }

  // Check for arrivals due today and execute them
  async checkAndExecuteArrivals() {
    try {
      console.log('Checking for scheduled arrivals...');
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      // Find all shop stocks with scheduled arrivals due today or earlier
      const shopStocks = await ShopStock.find({
        'gasStocks.nextArrival.status': 'scheduled',
        'gasStocks.nextArrival.autoUpdateEnabled': true,
        'gasStocks.nextArrival.arrivalDate': { $lte: today }
      });

      let totalExecuted = 0;

      for (const shopStock of shopStocks) {
        for (const stock of shopStock.gasStocks) {
          if (stock.nextArrival && 
              stock.nextArrival.status === 'scheduled' && 
              stock.nextArrival.autoUpdateEnabled && 
              new Date(stock.nextArrival.arrivalDate) <= today) {
            
            try {
              const executed = await shopStock.executeArrival(stock.brandName, stock.gasType);
              if (executed) {
                totalExecuted++;
                console.log(`✅ Executed arrival: ${stock.brandName} ${stock.gasType} - ${stock.nextArrival.expectedQuantity} units`);
                
                // Create notification/log entry
                await this.logArrivalExecution(shopStock.shopId, stock);
              }
            } catch (error) {
              console.error(`❌ Failed to execute arrival for ${stock.brandName} ${stock.gasType}:`, error.message);
            }
          }
        }
      }

      if (totalExecuted > 0) {
        console.log(`🎉 Successfully executed ${totalExecuted} scheduled arrivals`);
      } else {
        console.log('ℹ️ No arrivals due for execution');
      }
    } catch (error) {
      console.error('❌ Error in stock scheduler:', error.message);
    }
  }

  // Log arrival execution for audit trail
  async logArrivalExecution(shopId, stock) {
    try {
      // You could extend this to create notifications, send emails, etc.
      console.log(`📝 Logging arrival execution for shop ${shopId}: ${stock.brandName} ${stock.gasType}`);
    } catch (error) {
      console.error('Failed to log arrival execution:', error.message);
    }
  }

  // Manual trigger for testing
  async executeArrivalsNow() {
    console.log('🚀 Manually triggering arrival executions...');
    await this.checkAndExecuteArrivals();
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null,
      nextCheckIn: this.intervalId ? 'Running every hour' : 'Stopped'
    };
  }
}

// Export singleton instance
const stockScheduler = new StockScheduler();
export default stockScheduler;