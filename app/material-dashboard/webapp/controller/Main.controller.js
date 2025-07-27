sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("ai.mm.materialdashboard.controller.Main", {
        onInit: function () {
            // Main controller initialization
        },

        onNavigateToMaterials: function () {
            this.getRouter().navTo("RouteMaterials");
        },

        onNavigateToPOList: function () {
            this.getRouter().navTo("RoutePOList");
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        }
    });
});
