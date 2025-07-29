const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const AIModelService = require('../services/aiModelService');

// GET /api/health - Health check endpoint
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check AI model service health
    const modelHealth = await AIModelService.healthCheck();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        aiModels: modelHealth,
        huggingFace: {
          configured: !!process.env.HUGGINGFACE_API_KEY,
          status: process.env.HUGGINGFACE_API_KEY ? 'available' : 'not_configured'
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage()
      }
    };

    // Determine overall health status
    const allServicesHealthy = Object.values(healthStatus.services).every(
      service => service.status === 'healthy' || service.status === 'available'
    );

    if (!allServicesHealthy) {
      healthStatus.status = 'degraded';
      res.status(503);
    }

    res.json(healthStatus);
    
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime(),
      responseTime: Date.now() - startTime
    });
  }
});

// GET /api/health/detailed - Detailed health check
router.get('/health/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      service: 'AI Stock Prediction Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'not_applicable', message: 'Service is stateless' },
        aiModels: await AIModelService.detailedHealthCheck(),
        externalAPIs: {
          huggingFace: {
            configured: !!process.env.HUGGINGFACE_API_KEY,
            status: process.env.HUGGINGFACE_API_KEY ? 'configured' : 'not_configured',
            lastCheck: new Date().toISOString()
          }
        }
      },
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        loadAverage: require('os').loadavg()
      },
      configuration: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
      }
    };

    res.json(detailedHealth);
    
  } catch (error) {
    logger.error(`Detailed health check failed: ${error.message}`);
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/ready - Readiness probe
router.get('/health/ready', async (req, res) => {
  try {
    // Check if all required services are ready
    const modelReady = await AIModelService.isReady();
    
    if (modelReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'AI models not ready'
      });
    }
    
  } catch (error) {
    logger.error(`Readiness check failed: ${error.message}`);
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/live - Liveness probe
router.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
