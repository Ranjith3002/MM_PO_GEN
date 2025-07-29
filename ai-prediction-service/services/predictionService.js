const AIModelService = require('./aiModelService');
const logger = require('../utils/logger');

class PredictionService {
  
  // Main method for stock depletion prediction
  async predictStockDepletion(data) {
    try {
      const { materialName, currentStock, avgDailyConsumption, historicalData, seasonality, trend } = data;
      
      logger.info(`Starting stock depletion prediction for ${materialName}`);
      
      // Validate input data
      if (currentStock <= 0) {
        return {
          predictedStockOutInDays: 0,
          confidence: 1.0,
          model: 'immediate',
          factors: ['stock_depleted'],
          recommendations: ['Immediate reorder required']
        };
      }
      
      if (avgDailyConsumption <= 0) {
        return {
          predictedStockOutInDays: 999,
          confidence: 0.5,
          model: 'no_consumption',
          factors: ['no_consumption_detected'],
          recommendations: ['Review consumption data']
        };
      }
      
      // Get AI prediction
      const aiPrediction = await AIModelService.predictTimeSeries({
        currentStock,
        avgDailyConsumption,
        historicalData,
        seasonality,
        trend
      });
      
      // Calculate additional factors
      const factors = this.analyzeFactors(data);
      const recommendations = this.generateRecommendations(data, aiPrediction.predictedDays);
      
      // Apply business rules and adjustments
      const adjustedPrediction = this.applyBusinessRules(aiPrediction.predictedDays, factors);
      
      return {
        predictedStockOutInDays: adjustedPrediction,
        confidence: aiPrediction.confidence,
        model: aiPrediction.model,
        factors,
        recommendations,
        rawPrediction: aiPrediction.predictedDays,
        adjustmentApplied: adjustedPrediction !== aiPrediction.predictedDays
      };
      
    } catch (error) {
      logger.error(`Stock depletion prediction failed: ${error.message}`);
      throw new Error(`Prediction failed: ${error.message}`);
    }
  }
  
  // Main method for reorder quantity suggestion
  async suggestReorderQuantity(data) {
    try {
      const { materialName, avgDailyConsumption, leadTime, reorderLevel, safetyStock, maxStock, unitCost, holdingCostRate } = data;
      
      logger.info(`Starting reorder quantity suggestion for ${materialName}`);
      
      // Get AI prediction for optimal quantity
      const aiPrediction = await AIModelService.predictReorderQuantity({
        avgDailyConsumption,
        leadTime,
        reorderLevel,
        safetyStock,
        maxStock,
        unitCost,
        holdingCostRate
      });
      
      // Calculate Economic Order Quantity for comparison
      const eoqData = await AIModelService.economicOrderQuantity(data);
      
      // Generate reasoning
      const reasoning = this.generateReorderReasoning(data, aiPrediction, eoqData);
      
      // Calculate alternatives
      const alternatives = this.calculateAlternatives(data, aiPrediction.quantity);
      
      // Calculate total cost implications
      const totalCost = this.calculateTotalCost(data, aiPrediction.quantity);
      
      return {
        suggestedOrderQuantity: aiPrediction.quantity,
        reasoning,
        model: aiPrediction.model,
        economicOrderQuantity: eoqData.eoq,
        totalCost,
        alternatives,
        confidence: aiPrediction.confidence
      };
      
    } catch (error) {
      logger.error(`Reorder quantity suggestion failed: ${error.message}`);
      throw new Error(`Reorder suggestion failed: ${error.message}`);
    }
  }
  
  // Analyze factors affecting stock depletion
  analyzeFactors(data) {
    const { currentStock, avgDailyConsumption, reorderLevel, seasonality, trend } = data;
    const factors = [];
    
    // Stock level analysis
    if (currentStock <= reorderLevel) {
      factors.push('below_reorder_level');
    }
    
    // Consumption rate analysis
    const daysOfStock = currentStock / avgDailyConsumption;
    if (daysOfStock <= 7) {
      factors.push('critical_stock_level');
    } else if (daysOfStock <= 14) {
      factors.push('low_stock_level');
    }
    
    // Trend analysis
    if (trend === 'increasing') {
      factors.push('increasing_demand_trend');
    } else if (trend === 'decreasing') {
      factors.push('decreasing_demand_trend');
    }
    
    // Seasonality
    if (seasonality) {
      const currentMonth = new Date().getMonth();
      if ([5, 6, 7, 11].includes(currentMonth)) { // Peak months
        factors.push('peak_season');
      }
    }
    
    return factors;
  }
  
  // Generate recommendations based on prediction
  generateRecommendations(data, predictedDays) {
    const recommendations = [];
    const { currentStock, reorderLevel, avgDailyConsumption } = data;
    
    if (predictedDays <= 3) {
      recommendations.push('URGENT: Place emergency order immediately');
      recommendations.push('Consider expedited shipping');
    } else if (predictedDays <= 7) {
      recommendations.push('Place order within 24 hours');
      recommendations.push('Monitor consumption closely');
    } else if (predictedDays <= 14) {
      recommendations.push('Schedule order placement');
      recommendations.push('Review reorder level settings');
    }
    
    if (currentStock <= reorderLevel) {
      recommendations.push('Stock below reorder level - immediate action required');
    }
    
    // Consumption pattern recommendations
    const weeklyConsumption = avgDailyConsumption * 7;
    if (currentStock < weeklyConsumption) {
      recommendations.push('Less than one week of stock remaining');
    }
    
    return recommendations;
  }
  
  // Apply business rules to adjust predictions
  applyBusinessRules(predictedDays, factors) {
    let adjustedDays = predictedDays;
    
    // Apply safety margins based on factors
    if (factors.includes('critical_stock_level')) {
      adjustedDays = Math.max(1, adjustedDays - 1);
    }
    
    if (factors.includes('peak_season')) {
      adjustedDays = Math.max(1, adjustedDays * 0.8); // 20% faster depletion
    }
    
    if (factors.includes('increasing_demand_trend')) {
      adjustedDays = Math.max(1, adjustedDays * 0.9); // 10% faster depletion
    }
    
    return Math.round(adjustedDays);
  }
  
  // Generate reasoning for reorder quantity
  generateReorderReasoning(data, aiPrediction, eoqData) {
    const { avgDailyConsumption, leadTime, safetyStock = 0 } = data;
    const leadTimeDemand = avgDailyConsumption * leadTime;
    
    let reasoning = `Suggested quantity of ${aiPrediction.quantity} units based on:\n`;
    reasoning += `• Lead time demand: ${Math.round(leadTimeDemand)} units (${leadTime} days × ${avgDailyConsumption} daily consumption)\n`;
    
    if (safetyStock > 0) {
      reasoning += `• Safety stock: ${safetyStock} units\n`;
    }
    
    reasoning += `• Economic Order Quantity: ${eoqData.eoq} units\n`;
    reasoning += `• Model used: ${aiPrediction.model}\n`;
    
    if (aiPrediction.quantity > eoqData.eoq) {
      reasoning += `• Quantity above EOQ to ensure service level`;
    } else {
      reasoning += `• Quantity optimized for cost efficiency`;
    }
    
    return reasoning;
  }
  
  // Calculate alternative order quantities
  calculateAlternatives(data, suggestedQuantity) {
    const { avgDailyConsumption, leadTime } = data;
    const leadTimeDemand = avgDailyConsumption * leadTime;
    
    return {
      conservative: {
        quantity: Math.round(suggestedQuantity * 0.8),
        description: 'Lower quantity, higher reorder frequency',
        pros: ['Lower holding costs', 'Reduced obsolescence risk'],
        cons: ['Higher ordering costs', 'Increased stockout risk']
      },
      aggressive: {
        quantity: Math.round(suggestedQuantity * 1.2),
        description: 'Higher quantity, lower reorder frequency',
        pros: ['Lower ordering costs', 'Better service level'],
        cons: ['Higher holding costs', 'Increased capital tie-up']
      },
      minimum: {
        quantity: Math.round(leadTimeDemand),
        description: 'Minimum viable quantity (lead time demand)',
        pros: ['Minimal investment', 'Quick turnover'],
        cons: ['High stockout risk', 'No safety buffer']
      }
    };
  }
  
  // Calculate total cost implications
  calculateTotalCost(data, quantity) {
    const { avgDailyConsumption, unitCost = 1, holdingCostRate = 0.2 } = data;
    const annualDemand = avgDailyConsumption * 365;
    
    // Ordering cost (estimated)
    const orderingCost = 50;
    const ordersPerYear = annualDemand / quantity;
    const totalOrderingCost = ordersPerYear * orderingCost;
    
    // Holding cost
    const averageInventory = quantity / 2;
    const totalHoldingCost = averageInventory * unitCost * holdingCostRate;
    
    // Total cost
    const totalCost = totalOrderingCost + totalHoldingCost;
    
    return {
      orderingCost: Math.round(totalOrderingCost),
      holdingCost: Math.round(totalHoldingCost),
      totalCost: Math.round(totalCost),
      costPerUnit: Math.round((totalCost / annualDemand) * 100) / 100,
      breakdown: {
        ordersPerYear: Math.round(ordersPerYear * 10) / 10,
        averageInventory: Math.round(averageInventory),
        costComponents: {
          ordering: `${Math.round((totalOrderingCost / totalCost) * 100)}%`,
          holding: `${Math.round((totalHoldingCost / totalCost) * 100)}%`
        }
      }
    };
  }
}

module.exports = new PredictionService();
