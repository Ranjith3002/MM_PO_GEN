const axios = require('axios');
const cds = require('@sap/cds');

// Configuration for AI service
const AI_SERVICE_CONFIG = {
  baseURL: process.env.AI_SERVICE_URL ||
           process.env.NODE_ENV === 'production'
             ? 'https://ai-prediction-service-[your-route].cfapps.sap.hana.ondemand.com/api'
             : 'http://localhost:3000/api',
  timeout: 15000,
  retries: 3
};

// Utility functions
const validateMaterial = (material) => {
  if (!material) {
    throw new Error('Material not found');
  }
  if (material.currentStock < 0) {
    throw new Error('Invalid stock level');
  }
  if (material.reorderLevel <= 0) {
    throw new Error('Invalid reorder level');
  }
};

const calculateOptimalQuantity = (material) => {
  // Enhanced logic for calculating optimal order quantity
  const baseQuantity = material.reorderLevel * 2;
  const leadTimeBuffer = Math.ceil(material.leadTime / 7) * 10; // Weekly buffer
  return Math.max(baseQuantity, leadTimeBuffer);
};

const callAIService = async (endpoint, data, retries = AI_SERVICE_CONFIG.retries) => {
  try {
    const response = await axios.post(`${AI_SERVICE_CONFIG.baseURL}${endpoint}`, data, {
      timeout: AI_SERVICE_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SAP-CAP-Material-Management/1.0'
      }
    });
    return response.data;
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
      console.warn(`AI Service call failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callAIService(endpoint, data, retries - 1);
    }

    // Fallback logic when AI service is unavailable
    if (error.code === 'ECONNREFUSED') {
      console.warn('AI Service unavailable, using fallback logic');
      return { fallback: true, daysLeft: Math.floor(data.currentStock / (data.consumptionRate || 5)) };
    }

    throw error;
  }
};

module.exports = (srv) => {
  const { Materials, PurchaseOrders } = srv.entities;

  // Enhanced action to predict stock depletion
  srv.on('predictDepletion', async (req) => {
    try {
      const { materialID } = req.data;

      // Validate input
      if (!materialID) {
        return req.error(400, 'Material ID is required');
      }

      // Fetch material with error handling
      const material = await SELECT.one.from(Materials).where({ ID: materialID });
      validateMaterial(material);

      // Calculate consumption rate based on historical data (enhanced logic)
      const consumptionRate = await calculateConsumptionRate(materialID);

      // Call enhanced AI service with fallback
      const aiResult = await callAIService('/predict-depletion', {
        materialName: material.name,
        currentStock: material.currentStock,
        avgDailyConsumption: consumptionRate,
        seasonality: true,
        trend: 'stable'
      });

      // Format enhanced response
      if (aiResult.fallback) {
        return {
          success: true,
          prediction: `Estimated depletion in ${aiResult.daysLeft} days (fallback calculation)`,
          daysLeft: aiResult.daysLeft,
          confidence: 75,
          model: 'statistical_fallback',
          factors: material.currentStock <= material.reorderLevel ? ['below_reorder_level'] : [],
          recommendations: aiResult.daysLeft <= 7 ? ['Place order immediately'] : ['Monitor stock levels']
        };
      }

      return {
        success: true,
        prediction: `AI Prediction: Out of stock in ${aiResult.predictedStockOutInDays} days`,
        daysLeft: aiResult.predictedStockOutInDays || aiResult.daysLeft,
        confidence: Math.round((aiResult.confidence || 0.75) * 100),
        model: aiResult.model || 'ai_enhanced',
        factors: aiResult.factors || [],
        recommendations: aiResult.recommendations || [],
        aiInsight: aiResult.aiInsight,
        materialName: material.name,
        currentStock: material.currentStock,
        reorderLevel: material.reorderLevel
      };

    } catch (error) {
      console.error('Error in predictDepletion:', error);
      return req.error(500, `Prediction failed: ${error.message}`);
    }
  });

  // Enhanced action to generate PO
  srv.on('generatePO', async (req) => {
    const tx = cds.tx(req);

    try {
      const { materialID } = req.data;

      // Validate input
      if (!materialID) {
        return req.error(400, 'Material ID is required');
      }

      // Fetch material with validation
      const material = await tx.read(Materials).where({ ID: materialID });
      if (!material.length) {
        return req.error(404, 'Material not found');
      }

      const mat = material[0];
      validateMaterial(mat);

      // Check if PO already exists for this material (prevent duplicates)
      const existingPO = await tx.read(PurchaseOrders)
        .where({ material_ID: materialID, orderDate: { '>=': new Date(Date.now() - 24 * 60 * 60 * 1000) } });

      if (existingPO.length > 0) {
        return req.error(409, 'Purchase order already exists for this material within the last 24 hours');
      }

      // Calculate optimal quantity
      const quantity = calculateOptimalQuantity(mat);

      // Calculate consumption rate BEFORE starting transaction operations
      const dailyConsumption = await calculateConsumptionRate(materialID);

      // Get AI recommendation for quantity optimization
      let aiOptimizedQuantity = quantity;
      let aiReasoning = 'Standard calculation based on reorder level and lead time';

      try {
        const aiResult = await callAIService('/suggest-reorder', {
          materialName: mat.name,
          avgDailyConsumption: dailyConsumption,
          leadTime: mat.leadTime,
          reorderLevel: mat.reorderLevel,
          safetyStock: mat.safetyStock || 0,
          unitCost: mat.unitPrice || 1,
          holdingCostRate: 0.2
        });

        if (!aiResult.fallback && aiResult.suggestedOrderQuantity) {
          aiOptimizedQuantity = aiResult.suggestedOrderQuantity;
          aiReasoning = aiResult.reasoning || aiReasoning;
        }
      } catch (error) {
        console.warn('AI quantity optimization failed, using calculated quantity:', error.message);
      }

      // Create purchase order
      const orderDate = new Date();
      const deliveryDate = new Date(Date.now() + mat.leadTime * 24 * 60 * 60 * 1000);

      const poData = {
        material_ID: materialID,
        quantity: aiOptimizedQuantity,
        unitPrice: mat.unitPrice || 0,
        totalAmount: (mat.unitPrice || 0) * aiOptimizedQuantity,
        currency_code: mat.currency_code || 'USD',
        supplier_ID: mat.supplier_ID,
        suggestedByAI: true,
        orderDate: orderDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        expectedDeliveryDate: deliveryDate.toISOString().split('T')[0],
        status: 'PENDING',
        priority: mat.currentStock <= mat.reorderLevel ? 'HIGH' : 'MEDIUM',
        aiConfidence: 85.0,
        aiReason: aiReasoning
      };

      const result = await tx.create(PurchaseOrders).entries(poData);
      await tx.commit();

      // Return the created PO data directly (transaction is already committed)
      return {
        ID: result.ID,
        material_ID: materialID,
        materialName: mat.name,
        quantity: aiOptimizedQuantity,
        unitPrice: mat.unitPrice || 0,
        totalAmount: (mat.unitPrice || 0) * aiOptimizedQuantity,
        currency_code: mat.currency_code || 'USD',
        supplier_ID: mat.supplier_ID,
        supplierName: mat.supplierName,
        suggestedByAI: true,
        orderDate: orderDate.toISOString().split('T')[0],
        expectedDeliveryDate: deliveryDate.toISOString().split('T')[0],
        status: 'PENDING',
        priority: mat.currentStock <= mat.reorderLevel ? 'HIGH' : 'MEDIUM',
        aiConfidence: 85.0,
        aiReason: aiReasoning,
        success: true,
        message: `AI-optimized Purchase Order created successfully for ${mat.name}`
      };

    } catch (error) {
      try {
        await tx.rollback();
      } catch (rollbackError) {
        console.error('Transaction rollback failed:', rollbackError);
      }
      console.error('Error in generatePO:', error);
      return req.error(500, `PO generation failed: ${error.message}`);
    }
  });

  // Helper function to calculate consumption rate
  async function calculateConsumptionRate(materialID) {
    try {
      // Use a fresh database connection to avoid transaction conflicts
      const db = await cds.connect.to('db');
      const recentPOs = await db.run(
        SELECT.from(PurchaseOrders)
          .where({ material_ID: materialID })
          .orderBy('orderDate desc')
          .limit(5)
      );

      if (recentPOs.length > 0) {
        const avgQuantity = recentPOs.reduce((sum, po) => sum + po.quantity, 0) / recentPOs.length;
        return Math.max(avgQuantity / 30, 5); // Assume monthly consumption spread over 30 days
      }

      return 5; // Default consumption rate
    } catch (error) {
      console.warn('Error calculating consumption rate:', error);
      return 5; // Fallback rate
    }
  }

  // Add validation for entity operations
  srv.before('CREATE', 'Materials', (req) => {
    const { currentStock, reorderLevel } = req.data;

    if (currentStock < 0) {
      return req.error(400, 'Current stock cannot be negative');
    }

    if (reorderLevel <= 0) {
      return req.error(400, 'Reorder level must be greater than zero');
    }

    if (currentStock < reorderLevel) {
      req.info(`Warning: Current stock (${currentStock}) is below reorder level (${reorderLevel})`);
    }
  });

  srv.before('UPDATE', 'Materials', (req) => {
    const { currentStock, reorderLevel } = req.data;

    if (currentStock !== undefined && currentStock < 0) {
      return req.error(400, 'Current stock cannot be negative');
    }

    if (reorderLevel !== undefined && reorderLevel <= 0) {
      return req.error(400, 'Reorder level must be greater than zero');
    }
  });

  // Add logging for audit trail
  srv.after('CREATE', 'PurchaseOrders', (po) => {
    console.log(`Purchase Order created: ID=${po.ID}, Material=${po.material_ID}, Quantity=${po.quantity}, AI Suggested=${po.suggestedByAI}`);
  });
};
