const logger = require('../utils/logger');

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error: ${err.message}`);
  logger.error(`Stack: ${err.stack}`);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Joi validation errors
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Axios errors (external API calls)
  if (err.isAxiosError) {
    const message = `External API error: ${err.response?.data?.message || err.message}`;
    error = { message, statusCode: err.response?.status || 500 };
  }

  // Hugging Face API errors
  if (err.message && err.message.includes('Hugging Face')) {
    const message = 'AI model service temporarily unavailable';
    error = { message, statusCode: 503 };
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: error 
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
