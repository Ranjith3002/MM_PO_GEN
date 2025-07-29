# AI Stock Prediction Service

A Node.js-based REST API service that uses AI/ML models from Hugging Face and statistical methods to predict stock depletion and suggest optimal reorder quantities for inventory management.

## Features

- 🤖 **AI-Powered Predictions**: Uses Hugging Face models with statistical fallbacks
- 📊 **Stock Depletion Forecasting**: Predicts when materials will run out
- 📈 **Reorder Quantity Optimization**: Suggests optimal order quantities using EOQ and AI
- 🔄 **Batch Processing**: Handle multiple predictions in a single request
- 🛡️ **Production Ready**: Includes security, logging, rate limiting, and health checks
- 🐳 **Containerized**: Docker support for easy deployment
- 📝 **Comprehensive Logging**: Winston-based logging with multiple transports
- 🚀 **High Performance**: Optimized for concurrent requests

## API Endpoints

### 1. Predict Stock Depletion
```http
POST /api/predict-depletion
```

**Request Body:**
```json
{
  "materialName": "Steel Rods",
  "currentStock": 120,
  "avgDailyConsumption": 15,
  "historicalData": [
    {
      "date": "2024-01-01",
      "stock": 150,
      "consumption": 12
    }
  ],
  "seasonality": true,
  "trend": "increasing"
}
```

**Response:**
```json
{
  "predictedStockOutInDays": 8,
  "confidence": 0.85,
  "model": "statistical_forecast",
  "factors": ["below_reorder_level", "increasing_demand_trend"],
  "recommendations": ["Place order within 24 hours", "Monitor consumption closely"],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "materialName": "Steel Rods"
}
```

### 2. Suggest Reorder Quantity
```http
POST /api/suggest-reorder
```

**Request Body:**
```json
{
  "materialName": "Steel Rods",
  "avgDailyConsumption": 15,
  "leadTime": 5,
  "reorderLevel": 80,
  "safetyStock": 20,
  "unitCost": 25.50,
  "holdingCostRate": 0.2
}
```

**Response:**
```json
{
  "suggestedOrderQuantity": 100,
  "reasoning": "Suggested quantity of 100 units based on:\n• Lead time demand: 75 units\n• Safety stock: 20 units\n• Economic Order Quantity: 95 units",
  "model": "economic_order_quantity",
  "economicOrderQuantity": 95,
  "totalCost": {
    "orderingCost": 150,
    "holdingCost": 255,
    "totalCost": 405
  },
  "alternatives": {
    "conservative": {
      "quantity": 80,
      "description": "Lower quantity, higher reorder frequency"
    },
    "aggressive": {
      "quantity": 120,
      "description": "Higher quantity, lower reorder frequency"
    }
  }
}
```

### 3. Health Check
```http
GET /api/health
```

### 4. Available Models
```http
GET /api/models
```

### 5. Batch Prediction
```http
POST /api/batch-predict
```

## Installation

### Local Development

1. **Clone the repository:**
```bash
git clone <repository-url>
cd ai-prediction-service
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the service:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Docker Deployment

1. **Build and run with Docker:**
```bash
docker build -t ai-stock-prediction .
docker run -p 3000:3000 ai-stock-prediction
```

2. **Or use Docker Compose:**
```bash
docker-compose up -d
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `HUGGINGFACE_API_KEY` | Hugging Face API key (optional) | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |
| `DEFAULT_AI_MODEL` | Default model to use | `statistical` |
| `LOG_LEVEL` | Logging level | `info` |

### Hugging Face Integration

To use Hugging Face models:

1. Get an API key from [Hugging Face](https://huggingface.co/settings/tokens)
2. Set the `HUGGINGFACE_API_KEY` environment variable
3. The service will automatically use HF models when available, with statistical fallbacks

## AI Models

### Time Series Forecasting
- **Primary**: Hugging Face time series models (when API key provided)
- **Fallback**: Statistical forecasting with trend and seasonality analysis

### Reorder Quantity Optimization
- **Primary**: Hugging Face regression models (when API key provided)
- **Fallback**: Economic Order Quantity (EOQ) calculation

## Features

### Stock Depletion Prediction
- Trend analysis (increasing, decreasing, stable)
- Seasonality adjustments
- Historical data integration
- Business rule applications
- Confidence scoring

### Reorder Quantity Suggestions
- Economic Order Quantity calculation
- Lead time demand analysis
- Safety stock considerations
- Cost optimization
- Alternative quantity suggestions

### Production Features
- Rate limiting (100 requests per 15 minutes)
- Request validation with Joi
- Comprehensive error handling
- Security headers with Helmet
- CORS configuration
- Health checks and monitoring
- Structured logging

## Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:3000/api/predict-depletion \
  -H "Content-Type: application/json" \
  -d '{
    "materialName": "Steel Rods",
    "currentStock": 120,
    "avgDailyConsumption": 15
  }'
```

## Monitoring

### Health Endpoints
- `/api/health` - Basic health check
- `/api/health/detailed` - Detailed system information
- `/api/health/ready` - Readiness probe
- `/api/health/live` - Liveness probe

### Logging
Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)
- `logs/exceptions.log` (uncaught exceptions)

## Performance

- **Response Time**: < 100ms for statistical models
- **Concurrent Requests**: Supports 100+ concurrent requests
- **Memory Usage**: ~50MB base memory footprint
- **Rate Limiting**: 100 requests per 15 minutes per IP

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
