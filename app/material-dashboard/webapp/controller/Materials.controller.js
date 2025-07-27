sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/ValueState"
], function (Controller, MessageToast, MessageBox, ValueState) {
    "use strict";

    return Controller.extend("ai.mm.materialdashboard.controller.Materials", {
        onInit: function () {
            // Materials controller initialization
        },

        onNavBack: function () {
            this.getRouter().navTo("RouteMain");
        },

        onRefresh: function () {
            var oModel = this.getView().getModel();
            oModel.refresh();
            MessageToast.show(this.getResourceBundle().getText("loadingText"));
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

        formatItemsCount: function (aItems) {
            var iCount = aItems ? aItems.length : 0;
            return this.getResourceBundle().getText("itemsCount", [iCount]);
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getResourceBundle: function () {
            return this.getView().getModel("i18n").getResourceBundle();
        }
    });
});
