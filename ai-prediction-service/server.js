const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const predictionRoutes = require('./routes/prediction');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AI Stock Prediction Service',
    version: '1.0.0',
    description: 'AI-powered stock depletion prediction and reorder suggestion service',
    endpoints: {
      'POST /api/predict-depletion': 'Predict stock depletion timeline',
      'POST /api/suggest-reorder': 'Suggest optimal reorder quantity',
      'GET /api/health': 'Service health check',
      'GET /api/models': 'List available AI models'
    },
    documentation: {
      'predict-depletion': {
        method: 'POST',
        url: '/api/predict-depletion',
        body: {
          materialName: 'string',
          currentStock: 'number',
          avgDailyConsumption: 'number',
          historicalData: 'array (optional)'
        },
        response: {
          predictedStockOutInDays: 'number',
          confidence: 'number',
          model: 'string'
        }
      },
      'suggest-reorder': {
        method: 'POST',
        url: '/api/suggest-reorder',
        body: {
          materialName: 'string',
          avgDailyConsumption: 'number',
          leadTime: 'number',
          reorderLevel: 'number',
          safetyStock: 'number (optional)'
        },
        response: {
          suggestedOrderQuantity: 'number',
          reasoning: 'string',
          model: 'string'
        }
      }
    }
  });
});

// Routes
app.use('/api', healthRoutes);
app.use('/api', predictionRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/predict-depletion',
      'POST /api/suggest-reorder',
      'GET /api/models'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 AI Stock Prediction Service running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🤖 Hugging Face API: ${process.env.HUGGINGFACE_API_KEY ? 'Configured' : 'Not configured (using fallback models)'}`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}/`);
});

module.exports = app;
