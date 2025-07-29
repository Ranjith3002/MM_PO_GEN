sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/ValueState",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, ValueState, JSONModel) {
    "use strict";

    return Controller.extend("ai.mm.materialdashboard.controller.AIEnhancedMaterials", {

        onInit: function () {
            console.log("AI Enhanced Materials controller initialized");
            
            // Initialize AI service status
            this._initializeAIService();
            
            // Set up models for AI data
            this._setupAIModels();
            
            // Load materials and start AI analysis
            this._loadMaterialsWithAI();
        },

        _initializeAIService: function() {
            this.AI_SERVICE_URL = "http://localhost:3000/api";
            this._checkAIServiceStatus();
        },

        _setupAIModels: function() {
            // Model for AI predictions and recommendations
            var oAIModel = new JSONModel({
                predictions: {},
                recommendations: {},
                serviceStatus: {
                    available: false,
                    responseTime: 0,
                    successRate: 0
                },
                summary: {
                    criticalMaterials: 0,
                    totalPredictions: 0,
                    avgConfidence: 0,
                    aiGeneratedPOs: 0,
                    totalPOValue: 0,
                    avgOptimization: 0
                }
            });
            
            this.getView().setModel(oAIModel, "ai");
        },

        _checkAIServiceStatus: async function() {
            const statusStrip = this.byId("aiServiceStatus");

            try {
                console.log("Checking AI service at:", this.AI_SERVICE_URL);

                const response = await fetch(`${this.AI_SERVICE_URL}/health`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    timeout: 5000
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log("AI service response:", data);

                if (data.status === 'healthy') {
                    statusStrip.setText(`✅ AI Service: Online (${data.services?.huggingFace?.status || 'Ready'})`);
                    statusStrip.setType("Success");

                    // Update service status in model
                    this.getView().getModel("ai").setProperty("/serviceStatus/available", true);
                    this.getView().getModel("ai").setProperty("/serviceStatus/responseTime", data.responseTime || 0);

                } else {
                    statusStrip.setText("⚠️ AI Service: Available but Degraded");
                    statusStrip.setType("Warning");
                    this.getView().getModel("ai").setProperty("/serviceStatus/available", true);
                }

                // Hide status after 5 seconds
                setTimeout(() => {
                    statusStrip.setVisible(false);
                }, 5000);

            } catch (error) {
                console.error("AI service check failed:", error);
                statusStrip.setText(`❌ AI Service: ${error.message || 'Connection failed'} - Using Fallback Mode`);
                statusStrip.setType("Error");

                this.getView().getModel("ai").setProperty("/serviceStatus/available", false);

                // Show error longer for troubleshooting
                setTimeout(() => {
                    statusStrip.setText("❌ AI Service: Offline - Check if service is running on port 3000");
                    statusStrip.setType("Error");
                }, 3000);
            }
        },

        _loadMaterialsWithAI: async function() {
            try {
                // Load materials from OData service
                const oModel = this.getView().getModel();
                const oBinding = oModel.bindList("/Materials");
                
                const aContexts = await oBinding.requestContexts();
                console.log(`Loaded ${aContexts.length} materials for AI analysis`);
                
                // Start AI analysis for each material
                this._startBulkAIAnalysis(aContexts);
                
            } catch (error) {
                console.error("Error loading materials:", error);
                MessageToast.show("Error loading materials: " + error.message);
            }
        },

        _startBulkAIAnalysis: async function(aContexts) {
            const oAIModel = this.getView().getModel("ai");
            const progressStrip = this.byId("analysisProgress");
            
            progressStrip.setVisible(true);
            progressStrip.setText(`🤖 Analyzing ${aContexts.length} materials with AI...`);
            
            let criticalCount = 0;
            let totalConfidence = 0;
            let successfulPredictions = 0;
            
            for (let i = 0; i < aContexts.length; i++) {
                const oContext = aContexts[i];
                const oMaterial = oContext.getObject();
                
                try {
                    // Get AI prediction for this material
                    const prediction = await this._getAIPrediction(oMaterial);
                    
                    if (prediction.success) {
                        // Store prediction in AI model
                        oAIModel.setProperty(`/predictions/${oMaterial.ID}`, prediction);
                        
                        // Update statistics
                        if (prediction.daysLeft <= 7) {
                            criticalCount++;
                        }
                        totalConfidence += prediction.confidence;
                        successfulPredictions++;
                    }
                    
                    // Update progress
                    progressStrip.setText(`🤖 Analyzed ${i + 1}/${aContexts.length} materials...`);
                    
                } catch (error) {
                    console.error(`AI analysis failed for ${oMaterial.name}:`, error);
                }
            }
            
            // Update summary statistics
            oAIModel.setProperty("/summary/criticalMaterials", criticalCount);
            oAIModel.setProperty("/summary/totalPredictions", successfulPredictions);
            oAIModel.setProperty("/summary/avgConfidence", 
                successfulPredictions > 0 ? Math.round(totalConfidence / successfulPredictions) : 0);
            
            // Hide progress
            progressStrip.setVisible(false);
            
            MessageToast.show(`✅ AI Analysis Complete: ${successfulPredictions} materials analyzed, ${criticalCount} critical`);
        },

        _getAIPrediction: async function(oMaterial) {
            try {
                const response = await fetch(`${this.AI_SERVICE_URL}/predict-depletion`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        materialName: oMaterial.name,
                        currentStock: oMaterial.currentStock,
                        avgDailyConsumption: Math.max(1, oMaterial.currentStock * 0.05), // Estimate 5% daily consumption
                        seasonality: true,
                        trend: 'stable'
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                return {
                    success: true,
                    daysLeft: data.predictedStockOutInDays,
                    confidence: Math.round(data.confidence * 100),
                    model: data.model,
                    factors: data.factors || [],
                    recommendations: data.recommendations || [],
                    aiInsight: data.aiInsight,
                    prediction: data.prediction || `Out of stock in ${data.predictedStockOutInDays} days`
                };
                
            } catch (error) {
                console.error("AI prediction failed:", error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        onAIPredictPress: async function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const oMaterial = oContext.getObject();
            
            MessageToast.show(`🤖 Getting AI prediction for ${oMaterial.name}...`);
            
            try {
                const prediction = await this._getAIPrediction(oMaterial);
                
                if (prediction.success) {
                    // Store prediction in AI model
                    this.getView().getModel("ai").setProperty(`/predictions/${oMaterial.ID}`, prediction);
                    
                    // Show detailed prediction dialog
                    this._showPredictionDialog(oMaterial, prediction);
                } else {
                    MessageBox.error(`AI prediction failed: ${prediction.error}`);
                }
                
            } catch (error) {
                MessageBox.error(`Prediction failed: ${error.message}`);
            }
        },

        onAIGeneratePOPress: async function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const oMaterial = oContext.getObject();
            
            MessageToast.show(`🛒 Generating AI-optimized PO for ${oMaterial.name}...`);
            
            try {
                // Call CAP service to generate PO with AI optimization
                const oModel = this.getView().getModel();
                const oOperation = oModel.bindContext("/generatePO(...)");
                oOperation.setParameter("materialID", oMaterial.ID);
                
                await oOperation.execute();
                const result = oOperation.getBoundContext().getProperty("value");
                
                MessageBox.success(`✅ AI-optimized Purchase Order generated successfully!\n\nQuantity: ${result.quantity} units\nTotal: ${result.totalAmount} ${result.currency_code}`);
                
                // Refresh the model to show updated data
                oModel.refresh();
                
                // Update AI summary
                this._updatePOSummary();
                
            } catch (error) {
                MessageBox.error(`PO generation failed: ${error.message}`);
            }
        },

        _showPredictionDialog: function(oMaterial, prediction) {
            const sMessage = `🤖 AI Prediction for ${oMaterial.name}:\n\n` +
                `📊 Stock Depletion: ${prediction.daysLeft} days\n` +
                `🎯 Confidence: ${prediction.confidence}%\n` +
                `🔧 Model: ${prediction.model}\n\n` +
                `📋 Factors: ${prediction.factors.join(', ')}\n\n` +
                `💡 Recommendations:\n${prediction.recommendations.join('\n')}` +
                (prediction.aiInsight ? `\n\n🧠 AI Insight: ${prediction.aiInsight}` : '');
            
            MessageBox.information(sMessage, {
                title: "AI Stock Prediction",
                styleClass: "sapUiSizeCompact"
            });
        },

        onRefreshAIAnalysis: function() {
            MessageToast.show("🔄 Refreshing AI analysis...");
            this._loadMaterialsWithAI();
        },

        onBulkAIAnalysis: function() {
            MessageToast.show("📊 Starting bulk AI analysis...");
            this._loadMaterialsWithAI();
        },

        _updatePOSummary: function() {
            // This would typically fetch PO data and update summary
            const oAIModel = this.getView().getModel("ai");
            const currentCount = oAIModel.getProperty("/summary/aiGeneratedPOs") || 0;
            oAIModel.setProperty("/summary/aiGeneratedPOs", currentCount + 1);
        },

        onNavBack: function() {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("main");
        },

        // Formatter functions
        formatStockState: function(currentStock, reorderLevel) {
            if (currentStock <= reorderLevel * 0.5) {
                return ValueState.Error;
            } else if (currentStock <= reorderLevel) {
                return ValueState.Warning;
            }
            return ValueState.Success;
        },

        formatStockIcon: function(currentStock, reorderLevel) {
            if (currentStock <= reorderLevel * 0.5) {
                return "sap-icon://alert";
            } else if (currentStock <= reorderLevel) {
                return "sap-icon://warning";
            }
            return "sap-icon://accept";
        },

        formatStockIconColor: function(currentStock, reorderLevel) {
            if (currentStock <= reorderLevel * 0.5) {
                return "Critical";
            } else if (currentStock <= reorderLevel) {
                return "Warning";
            }
            return "Good";
        },

        formatPOButtonEnabled: function(currentStock, reorderLevel) {
            return currentStock <= reorderLevel;
        }
    });
});
