sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/ValueState"
], function (Controller, MessageToast, ValueState) {
    "use strict";

    return Controller.extend("ai.mm.materialdashboard.controller.POList", {
        onInit: function () {
            // PO List controller initialization
        },

        onNavBack: function () {
            this.getRouter().navTo("RouteMain");
        },

        onRefresh: function () {
            var oModel = this.getView().getModel();
            oModel.refresh();
            MessageToast.show(this.getResourceBundle().getText("loadingText"));
        },

        onFilterChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oTable = this.byId("poTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            if (sSelectedKey === "ai") {
                aFilters.push(new sap.ui.model.Filter("suggestedByAI", sap.ui.model.FilterOperator.EQ, true));
            } else if (sSelectedKey === "manual") {
                aFilters.push(new sap.ui.model.Filter("suggestedByAI", sap.ui.model.FilterOperator.EQ, false));
            }
            // "all" case - no filters applied

            oBinding.filter(aFilters);
        },

        formatAISuggested: function (bSuggestedByAI) {
            if (bSuggestedByAI) {
                return this.getResourceBundle().getText("yesText");
            }
            return this.getResourceBundle().getText("noText");
        },

        formatAIState: function (bSuggestedByAI) {
            return bSuggestedByAI ? ValueState.Success : ValueState.None;
        },

        formatAIIcon: function (bSuggestedByAI) {
            return bSuggestedByAI ? "sap-icon://robot" : "sap-icon://person-placeholder";
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
