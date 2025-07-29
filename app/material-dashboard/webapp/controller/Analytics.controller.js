sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/ValueState",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, ValueState, JSONModel) {
    "use strict";

    return Controller.extend("ai.mm.materialdashboard.controller.Analytics", {
        onInit: function () {
            // Initialize analytics data model
            var oAnalyticsModel = new JSONModel({
                StockStatusData: [],
                CategoryData: []
            });
            this.getView().setModel(oAnalyticsModel, "analytics");
            
            // Load initial data
            this.loadAnalyticsData();
        },

        onNavBack: function () {
            this.getRouter().navTo("RouteMain");
        },

        onRefresh: function () {
            this.loadAnalyticsData();
            var oModel = this.getView().getModel();
            oModel.refresh();
            MessageToast.show(this.getResourceBundle().getText("loadingText"));
        },

        loadAnalyticsData: function () {
            var oModel = this.getView().getModel();
            var oAnalyticsModel = this.getView().getModel("analytics");
            
            // Load KPIs
            this.loadKPIs();
            
            // Load chart data
            this.loadStockStatusData();
            this.loadCategoryData();
        },

        loadKPIs: function () {
            var oModel = this.getView().getModel();
            
            // Total Materials
            oModel.read("/Materials", {
                success: function (oData) {
                    this.byId("totalMaterialsKPI").setNumber(oData.results.length);
                }.bind(this)
            });
            
            // Low Stock Items
            oModel.read("/MaterialsWithLowStock", {
                success: function (oData) {
                    this.byId("lowStockKPI").setNumber(oData.results.length);
                }.bind(this)
            });
            
            // Pending POs
            oModel.read("/PurchaseOrders", {
                filters: [new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "PENDING")],
                success: function (oData) {
                    this.byId("pendingPOsKPI").setNumber(oData.results.length);
                }.bind(this)
            });
            
            // AI Predictions
            oModel.read("/StockPredictions", {
                filters: [new sap.ui.model.Filter("isActive", sap.ui.model.FilterOperator.EQ, true)],
                success: function (oData) {
                    this.byId("aiPredictionsKPI").setNumber(oData.results.length);
                }.bind(this)
            });
        },

        loadStockStatusData: function () {
            var oModel = this.getView().getModel();
            var oAnalyticsModel = this.getView().getModel("analytics");
            
            oModel.read("/Materials", {
                success: function (oData) {
                    var aStockStatus = [
                        { status: "Critical", count: 0 },
                        { status: "Low", count: 0 },
                        { status: "Warning", count: 0 },
                        { status: "Normal", count: 0 }
                    ];
                    
                    oData.results.forEach(function (material) {
                        var currentStock = material.currentStock;
                        var reorderLevel = material.reorderLevel;
                        var minStock = material.minStock || 0;
                        
                        if (currentStock <= minStock) {
                            aStockStatus[0].count++; // Critical
                        } else if (currentStock <= reorderLevel) {
                            aStockStatus[1].count++; // Low
                        } else if (currentStock <= reorderLevel * 1.5) {
                            aStockStatus[2].count++; // Warning
                        } else {
                            aStockStatus[3].count++; // Normal
                        }
                    });
                    
                    oAnalyticsModel.setProperty("/StockStatusData", aStockStatus);
                }.bind(this)
            });
        },

        loadCategoryData: function () {
            var oModel = this.getView().getModel();
            var oAnalyticsModel = this.getView().getModel("analytics");
            
            oModel.read("/Materials", {
                expand: "category",
                success: function (oData) {
                    var oCategoryCount = {};
                    
                    oData.results.forEach(function (material) {
                        var categoryName = material.categoryName || "Uncategorized";
                        oCategoryCount[categoryName] = (oCategoryCount[categoryName] || 0) + 1;
                    });
                    
                    var aCategoryData = Object.keys(oCategoryCount).map(function (category) {
                        return {
                            category: category,
                            count: oCategoryCount[category]
                        };
                    });
                    
                    oAnalyticsModel.setProperty("/CategoryData", aCategoryData);
                }.bind(this)
            });
        },

        onGeneratePOFromAnalytics: function (oEvent) {
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
                this.onRefresh();
            }.bind(this)).catch(function (oError) {
                MessageBox.error(
                    this.getResourceBundle().getText("errorMessage", [oError.message])
                );
            }.bind(this));
        },

        formatStockStatusState: function (sStatus) {
            switch (sStatus) {
                case "CRITICAL":
                    return ValueState.Error;
                case "LOW":
                    return ValueState.Error;
                case "WARNING":
                    return ValueState.Warning;
                case "NORMAL":
                    return ValueState.Success;
                default:
                    return ValueState.None;
            }
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getResourceBundle: function () {
            return this.getView().getModel("i18n").getResourceBundle();
        }
    });
});
