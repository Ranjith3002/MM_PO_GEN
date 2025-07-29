sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/ValueState",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, ValueState, JSONModel) {
    "use strict";

    return Controller.extend("ai.mm.materialdashboard.controller.Materials", {
        onInit: function () {
            // Materials controller initialization
            console.log("Materials controller initialized");

            // Initialize view model for UI state
            var oViewModel = new JSONModel({
                busy: false,
                materialsCount: 0,
                lowStockCount: 0
            });
            this.getView().setModel(oViewModel, "view");

            // Get the OData model and set up event handlers
            var oModel = this.getView().getModel();
            console.log("Model in Materials controller:", oModel);

            if (oModel) {
                // Set up global model event handlers
                oModel.attachRequestCompleted(this._onRequestCompleted.bind(this));
                oModel.attachRequestFailed(this._onRequestFailed.bind(this));

                // Force initial data load
                this._loadMaterialsData();
            } else {
                console.error("No OData model found!");
                this._showError("No data model available. Please check your connection.");
            }
        },

        _loadMaterialsData: function() {
            console.log("Loading materials data...");
            var oModel = this.getView().getModel();
            var oViewModel = this.getView().getModel("view");

            if (oModel) {
                oViewModel.setProperty("/busy", true);

                // Create a binding to trigger data load
                var oBinding = oModel.bindList("/Materials");
                oBinding.requestContexts().then(function(aContexts) {
                    console.log("Materials loaded successfully:", aContexts.length, "items");
                    oViewModel.setProperty("/busy", false);
                    oViewModel.setProperty("/materialsCount", aContexts.length);

                    // Count low stock items
                    var iLowStock = 0;
                    aContexts.forEach(function(oContext) {
                        var oData = oContext.getObject();
                        if (oData.currentStock <= oData.reorderLevel) {
                            iLowStock++;
                        }
                    });
                    oViewModel.setProperty("/lowStockCount", iLowStock);

                    this._showSuccess("Loaded " + aContexts.length + " materials (" + iLowStock + " low stock)");
                }.bind(this)).catch(function(oError) {
                    console.error("Failed to load materials:", oError);
                    oViewModel.setProperty("/busy", false);
                    this._showError("Failed to load materials: " + oError.message);
                }.bind(this));
            }
        },

        _onRequestCompleted: function(oEvent) {
            console.log("Request completed:", oEvent.getParameters());
        },

        _onRequestFailed: function(oEvent) {
            console.error("Request failed:", oEvent.getParameters());
            this._showError("Data request failed. Please try refreshing.");
        },

        _showSuccess: function(sMessage) {
            var oMessageStrip = this.byId("statusMessage");
            if (oMessageStrip) {
                oMessageStrip.setText(sMessage);
                oMessageStrip.setType("Success");
                oMessageStrip.setVisible(true);
            }
        },

        _showError: function(sMessage) {
            var oMessageStrip = this.byId("statusMessage");
            if (oMessageStrip) {
                oMessageStrip.setText(sMessage);
                oMessageStrip.setType("Error");
                oMessageStrip.setVisible(true);
            }
        },

        onDataRequested: function() {
            console.log("Data requested for materials table");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/busy", true);
            this._showSuccess("Loading materials...");
        },

        onDataReceived: function(oEvent) {
            console.log("Data received for materials table:", oEvent.getParameters());
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/busy", false);

            var oData = oEvent.getParameter("data");
            if (oData && oData.value) {
                var iCount = oData.value.length;
                console.log("Received " + iCount + " materials");
                oViewModel.setProperty("/materialsCount", iCount);
                this._showSuccess("Successfully loaded " + iCount + " materials");

                // Hide status message after 3 seconds
                setTimeout(function() {
                    var oMessageStrip = this.byId("statusMessage");
                    if (oMessageStrip) {
                        oMessageStrip.setVisible(false);
                    }
                }.bind(this), 3000);
            } else {
                this._showError("No materials data received");
            }
        },

        onNavBack: function () {
            this.getRouter().navTo("RouteMain");
        },

        onRefresh: function () {
            console.log("Refresh button clicked");
            MessageToast.show("Refreshing materials data...");

            var oModel = this.getView().getModel();
            if (oModel) {
                // Refresh the model
                oModel.refresh();
                // Reload materials data
                this._loadMaterialsData();
            } else {
                console.error("No model found for refresh");
                this._showError("No data model available for refresh");
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("materialsTable");
            var oBinding = oTable.getBinding("items");
            
            if (sQuery && sQuery.length > 0) {
                var oFilter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery);
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onPredictDepletion: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext();
            var sMaterialID = oBindingContext.getProperty("ID");
            var sMaterialName = oBindingContext.getProperty("name");
            
            var oModel = this.getView().getModel();
            var oOperation = oModel.bindContext("/predictDepletion(...)");
            
            oOperation.setParameter("materialID", sMaterialID);
            
            oOperation.execute().then(function () {
                var sResult = oOperation.getBoundContext().getProperty("value");
                MessageBox.information(
                    this.getResourceBundle().getText("predictDepletionSuccess") + "\n" + 
                    sMaterialName + ": " + sResult
                );
            }.bind(this)).catch(function (oError) {
                MessageBox.error(
                    this.getResourceBundle().getText("errorMessage", [oError.message])
                );
            }.bind(this));
        },

        onGeneratePO: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext();
            var sMaterialID = oBindingContext.getProperty("ID");
            var sMaterialName = oBindingContext.getProperty("name");
            
            var oModel = this.getView().getModel();
            var oOperation = oModel.bindContext("/generatePO(...)");
            
            oOperation.setParameter("materialID", sMaterialID);
            
            oOperation.execute().then(function () {
                MessageToast.show(
                    this.getResourceBundle().getText("generatePOSuccess") + " for " + sMaterialName
                );
                // Refresh the PO list if needed
                this.onRefresh();
            }.bind(this)).catch(function (oError) {
                MessageBox.error(
                    this.getResourceBundle().getText("errorMessage", [oError.message])
                );
            }.bind(this));
        },

        formatStockState: function (iCurrentStock, iReorderLevel) {
            if (iCurrentStock <= iReorderLevel) {
                return ValueState.Error;
            } else if (iCurrentStock <= iReorderLevel * 1.5) {
                return ValueState.Warning;
            }
            return ValueState.Success;
        },

        onUpdateStock: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext();
            var sMaterialID = oBindingContext.getProperty("ID");
            var sMaterialName = oBindingContext.getProperty("name");
            var iCurrentStock = oBindingContext.getProperty("currentStock");

            // Create dialog for stock update
            if (!this._oStockUpdateDialog) {
                this._oStockUpdateDialog = new sap.m.Dialog({
                    title: "Update Stock",
                    contentWidth: "400px",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Material: " + sMaterialName }),
                                new sap.m.Label({ text: "Current Stock: " + iCurrentStock }),
                                new sap.m.Input({
                                    id: "newStockInput",
                                    placeholder: "Enter new stock quantity",
                                    type: "Number",
                                    value: iCurrentStock
                                }),
                                new sap.m.TextArea({
                                    id: "stockUpdateReason",
                                    placeholder: "Reason for stock update",
                                    rows: 3
                                })
                            ]
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Update",
                        type: "Emphasized",
                        press: function () {
                            this._performStockUpdate(sMaterialID);
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            this._oStockUpdateDialog.close();
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this._oStockUpdateDialog);
            }

            // Update dialog content for current material
            sap.ui.getCore().byId("newStockInput").setValue(iCurrentStock);
            sap.ui.getCore().byId("stockUpdateReason").setValue("");
            this._currentMaterialID = sMaterialID;
            this._oStockUpdateDialog.open();
        },

        _performStockUpdate: function (sMaterialID) {
            var iNewStock = parseInt(sap.ui.getCore().byId("newStockInput").getValue());
            var sReason = sap.ui.getCore().byId("stockUpdateReason").getValue();

            if (isNaN(iNewStock) || iNewStock < 0) {
                MessageBox.error("Please enter a valid stock quantity");
                return;
            }

            if (!sReason.trim()) {
                MessageBox.error("Please provide a reason for the stock update");
                return;
            }

            var oModel = this.getView().getModel();
            var oOperation = oModel.bindContext("/Materials(" + sMaterialID + ")/updateStock(...)");

            oOperation.setParameter("newStock", iNewStock);
            oOperation.setParameter("reason", sReason);

            oOperation.execute().then(function () {
                MessageToast.show("Stock updated successfully");
                this._oStockUpdateDialog.close();
                this.onRefresh();
            }.bind(this)).catch(function (oError) {
                MessageBox.error("Stock update failed: " + oError.message);
            }.bind(this));
        },

        formatTotalValue: function (iStock, fUnitPrice) {
            if (!iStock || !fUnitPrice) return "0.00";
            return (iStock * fUnitPrice).toFixed(2);
        },

        formatItemsCount: function (aItems) {
            var iCount = aItems ? aItems.length : 0;
            return this.getResourceBundle().getText("itemsCount", [iCount]);
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getResourceBundle: function () {
            return this.getView().getModel("i18n").getResourceBundle();
        },

        onAIPredictDepletion: async function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sMaterialID = oContext.getProperty("ID");
            var sMaterialName = oContext.getProperty("name");
            var iCurrentStock = oContext.getProperty("currentStock");

            MessageToast.show("🤖 Getting AI prediction for " + sMaterialName + "...");

            try {
                // Call AI service directly
                const response = await fetch('http://localhost:3000/api/predict-depletion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        materialName: sMaterialName,
                        currentStock: iCurrentStock,
                        avgDailyConsumption: Math.max(1, iCurrentStock * 0.05),
                        seasonality: true,
                        trend: 'stable'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                const sMessage = `🤖 AI Prediction for ${sMaterialName}:\n\n` +
                    `📊 Stock Depletion: ${data.predictedStockOutInDays} days\n` +
                    `🎯 Confidence: ${Math.round(data.confidence * 100)}%\n` +
                    `🔧 Model: ${data.model}\n\n` +
                    `📋 Factors: ${data.factors?.join(', ') || 'None'}\n\n` +
                    `💡 Recommendations:\n${data.recommendations?.join('\n') || 'None'}` +
                    (data.aiInsight ? `\n\n🧠 AI Insight: ${data.aiInsight}` : '');

                MessageBox.information(sMessage, {
                    title: "AI Stock Prediction",
                    styleClass: "sapUiSizeCompact"
                });

            } catch (error) {
                console.error("AI prediction failed:", error);
                MessageBox.error(`AI prediction failed: ${error.message}`);
            }
        },

        onAIGeneratePO: async function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sMaterialID = oContext.getProperty("ID");
            var sMaterialName = oContext.getProperty("name");

            MessageToast.show("🛒 Generating AI-optimized PO for " + sMaterialName + "...");

            try {
                var oModel = this.getView().getModel();
                var oOperation = oModel.bindContext("/generatePO(...)");
                oOperation.setParameter("materialID", sMaterialID);

                await oOperation.execute();
                var result = oOperation.getBoundContext().getProperty("value");

                MessageBox.success(`✅ AI-optimized Purchase Order generated!\n\nMaterial: ${sMaterialName}\nQuantity: ${result.quantity} units\nTotal: ${result.totalAmount} ${result.currency_code}`);

                oModel.refresh();

            } catch (error) {
                console.error("AI PO generation failed:", error);
                MessageBox.error(`AI PO generation failed: ${error.message}`);
            }
        },

        formatPOButtonEnabled: function(currentStock, reorderLevel) {
            return currentStock <= reorderLevel;
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

        formatTotalValue: function(currentStock, unitPrice) {
            if (!currentStock || !unitPrice) return "0";
            return (currentStock * unitPrice).toFixed(2);
        }
    });
});
