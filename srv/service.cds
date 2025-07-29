using ai.mm as mm from '../db/data-model';

service POService @(path: '/odata/v4/po') {

  // Main entities
  @cds.redirection.target
  entity Materials as projection on mm.Materials {
    *,
    category.name as categoryName,
    supplier.name as supplierName
  } actions {
    action predictDepletion() returns String;
    action generatePO() returns PurchaseOrders;
    action updateStock(newStock: Integer, reason: String) returns Materials;
  };

  @cds.redirection.target
  entity PurchaseOrders as projection on mm.PurchaseOrders {
    *,
    material.name as materialName,
    supplier.name as supplierName
  } actions {
    action approve(approverName: String) returns PurchaseOrders;
    action cancel(reason: String) returns PurchaseOrders;
  };

  // Supporting entities
  entity MaterialCategories as projection on mm.MaterialCategories;
  entity Suppliers as projection on mm.Suppliers;
  entity StockMovements as projection on mm.StockMovements {
    *,
    material.name as materialName
  };
  entity StockPredictions as projection on mm.StockPredictions {
    *,
    material.name as materialName
  };

  // Configuration
  entity SystemConfig as projection on mm.SystemConfig;

  // Views for analytics
  entity MaterialsWithLowStock as projection on mm.MaterialsWithLowStock;

  // Global actions
  action generatePO(materialID: UUID) returns PurchaseOrders;
  action predictDepletion(materialID: UUID) returns String;
  action bulkUpdateStock(updates: array of {materialID: UUID; newStock: Integer; reason: String}) returns String;
  action generateLowStockReport() returns String;
  action optimizeInventory() returns String;

  // Functions for analytics
  function getStockTrends(materialID: UUID, days: Integer) returns String;
  function getSupplierPerformance(supplierID: UUID) returns String;
  function getMaterialInsights(materialID: UUID) returns String;
}
