const express = require('express');
const router = express.Router();
const Joi = require('joi');
const logger = require('../utils/logger');
const AIModelService = require('../services/aiModelService');
const PredictionService = require('../services/predictionService');

// Validation schemas
const depletionSchema = Joi.object({
  materialName: Joi.string().required().min(1).max(100),
  currentStock: Joi.number().required().min(0),
  avgDailyConsumption: Joi.number().required().min(0.1),
  historicalData: Joi.array().items(Joi.object({
    date: Joi.string().isoDate(),
    stock: Joi.number().min(0),
    consumption: Joi.number().min(0)
  })).optional(),
  seasonality: Joi.boolean().optional(),
  trend: Joi.string().valid('increasing', 'decreasing', 'stable').optional()
});

const reorderSchema = Joi.object({
  materialName: Joi.string().required().min(1).max(100),
  avgDailyConsumption: Joi.number().required().min(0.1),
  leadTime: Joi.number().required().min(1),
  reorderLevel: Joi.number().required().min(0),
  safetyStock: Joi.number().optional().min(0),
  maxStock: Joi.number().optional().min(0),
  unitCost: Joi.number().optional().min(0),
  holdingCostRate: Joi.number().optional().min(0).max(1)
});

// POST /api/predict-depletion
router.post('/predict-depletion', async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = depletionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        details: error.details
      });
    }

    const { materialName, currentStock, avgDailyConsumption, historicalData, seasonality, trend } = value;

    logger.info(`Predicting depletion for material: ${materialName}`);

    // Get prediction from AI service
    const prediction = await PredictionService.predictStockDepletion({
      materialName,
      currentStock,
      avgDailyConsumption,
      historicalData,
      seasonality,
      trend
    });

    // Log the prediction
    logger.info(`Prediction completed for ${materialName}: ${prediction.predictedStockOutInDays} days`);

    res.json({
      predictedStockOutInDays: prediction.predictedStockOutInDays,
      confidence: prediction.confidence,
      model: prediction.model,
      factors: prediction.factors,
      recommendations: prediction.recommendations,
      timestamp: new Date().toISOString(),
      materialName
    });

  } catch (error) {
    logger.error(`Error in predict-depletion: ${error.message}`);
    next(error);
  }
});

// POST /api/suggest-reorder
router.post('/suggest-reorder', async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = reorderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        details: error.details
      });
    }

    const { 
      materialName, 
      avgDailyConsumption, 
      leadTime, 
      reorderLevel, 
      safetyStock,
      maxStock,
      unitCost,
      holdingCostRate
    } = value;

    logger.info(`Suggesting reorder quantity for material: ${materialName}`);

    // Get reorder suggestion from AI service
    const suggestion = await PredictionService.suggestReorderQuantity({
      materialName,
      avgDailyConsumption,
      leadTime,
      reorderLevel,
      safetyStock,
      maxStock,
      unitCost,
      holdingCostRate
    });

    // Log the suggestion
    logger.info(`Reorder suggestion completed for ${materialName}: ${suggestion.suggestedOrderQuantity} units`);

    res.json({
      suggestedOrderQuantity: suggestion.suggestedOrderQuantity,
      reasoning: suggestion.reasoning,
      model: suggestion.model,
      economicOrderQuantity: suggestion.economicOrderQuantity,
      totalCost: suggestion.totalCost,
      alternatives: suggestion.alternatives,
      timestamp: new Date().toISOString(),
      materialName
    });

  } catch (error) {
    logger.error(`Error in suggest-reorder: ${error.message}`);
    next(error);
  }
});

// GET /api/models - List available AI models
router.get('/models', async (req, res, next) => {
  try {
    const models = await AIModelService.getAvailableModels();
    
    res.json({
      availableModels: models,
      defaultModel: process.env.DEFAULT_AI_MODEL || 'statistical',
      huggingFaceEnabled: !!process.env.HUGGINGFACE_API_KEY,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error in models endpoint: ${error.message}`);
    next(error);
  }
});

// POST /api/batch-predict - Batch prediction for multiple materials
router.post('/batch-predict', async (req, res, next) => {
  try {
    const batchSchema = Joi.object({
      materials: Joi.array().items(depletionSchema).required().min(1).max(50)
    });

    const { error, value } = batchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { materials } = value;
    logger.info(`Processing batch prediction for ${materials.length} materials`);

    const predictions = await Promise.all(
      materials.map(async (material) => {
        try {
          const prediction = await PredictionService.predictStockDepletion(material);
          return {
            materialName: material.materialName,
            success: true,
            ...prediction
          };
        } catch (error) {
          logger.error(`Batch prediction failed for ${material.materialName}: ${error.message}`);
          return {
            materialName: material.materialName,
            success: false,
            error: error.message
          };
        }
      })
    );

    const successful = predictions.filter(p => p.success).length;
    const failed = predictions.filter(p => !p.success).length;

    res.json({
      results: predictions,
      summary: {
        total: materials.length,
        successful,
        failed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error in batch-predict: ${error.message}`);
    next(error);
  }
});

module.exports = router;
