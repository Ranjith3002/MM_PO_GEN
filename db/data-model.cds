namespace ai.mm;

using { cuid, managed, Currency } from '@sap/cds/common';

// Enhanced Materials entity with additional fields
entity Materials : cuid, managed {
  name            : String(100) not null;
  description     : String(500);
  category        : Association to MaterialCategories;
  currentStock    : Integer not null default 0;
  reorderLevel    : Integer not null;
  maxStock        : Integer;
  minStock        : Integer default 0;
  unitOfMeasure   : String(10) default 'PCS';
  unitPrice       : Decimal(10,2);
  currency        : Currency;
  supplier        : Association to Suppliers;
  leadTime        : Integer not null; // in days
  safetyStock     : Integer default 0;
  location        : String(50);
  barcode         : String(50);
  isActive        : Boolean default true;
  lastStockUpdate : DateTime;

  // Relationships
  purchaseOrders  : Composition of many PurchaseOrders on purchaseOrders.material = $self;
  stockMovements  : Composition of many StockMovements on stockMovements.material = $self;
  predictions     : Composition of many StockPredictions on predictions.material = $self;
}

// Enhanced Purchase Orders with more fields
entity PurchaseOrders : cuid, managed {
  material        : Association to Materials not null;
  quantity        : Integer not null;
  unitPrice       : Decimal(10,2);
  totalAmount     : Decimal(12,2);
  currency        : Currency;
  supplier        : Association to Suppliers;
  suggestedByAI   : Boolean default false;
  orderDate       : Date not null;
  expectedDeliveryDate : Date;
  actualDeliveryDate   : Date;
  status          : String(20) default 'PENDING'; // PENDING, APPROVED, ORDERED, DELIVERED, CANCELLED
  approvedBy      : String(100);
  approvalDate    : DateTime;
  notes           : String(1000);
  priority        : String(10) default 'MEDIUM'; // LOW, MEDIUM, HIGH, URGENT

  // AI-related fields
  aiConfidence    : Decimal(5,2); // AI prediction confidence percentage
  aiReason        : String(500);  // Reason for AI suggestion
}

// New entity for Material Categories
entity MaterialCategories : cuid {
  name        : String(100) not null;
  description : String(500);
  isActive    : Boolean default true;

  materials   : Composition of many Materials on materials.category = $self;
}

// New entity for Suppliers
entity Suppliers : cuid, managed {
  name            : String(100) not null;
  contactPerson   : String(100);
  email           : String(100);
  phone           : String(20);
  address         : String(500);
  city            : String(50);
  country         : String(50);
  rating          : Decimal(3,2); // 1.00 to 5.00
  isActive        : Boolean default true;
  paymentTerms    : String(50);
  deliveryTerms   : String(50);

  // Relationships
  materials       : Composition of many Materials on materials.supplier = $self;
  purchaseOrders  : Composition of many PurchaseOrders on purchaseOrders.supplier = $self;
}

// New entity for Stock Movements (audit trail)
entity StockMovements : cuid, managed {
  material        : Association to Materials not null;
  movementType    : String(20) not null; // IN, OUT, ADJUSTMENT, TRANSFER
  quantity        : Integer not null;
  previousStock   : Integer;
  newStock        : Integer;
  reference       : String(100); // PO number, adjustment reason, etc.
  notes           : String(500);
  location        : String(50);
}

// New entity for AI Stock Predictions
entity StockPredictions : cuid, managed {
  material            : Association to Materials not null;
  predictionDate      : DateTime not null;
  predictedDepletionDate : Date;
  daysUntilDepletion  : Integer;
  confidence          : Decimal(5,2); // Confidence percentage
  consumptionRate     : Decimal(10,2);
  factors             : String(1000); // JSON string of factors considered
  isActive            : Boolean default true;
}

// New entity for System Configuration
entity SystemConfig : cuid {
  key configKey   : String(50);
  configValue     : String(500);
  description     : String(200);
  isActive        : Boolean default true;
  lastUpdated     : DateTime;
}

// Views for reporting and analytics
view MaterialsWithLowStock as select from Materials {
  *,
  case
    when currentStock <= minStock then 'CRITICAL'
    when currentStock <= reorderLevel then 'LOW'
    when currentStock <= reorderLevel * 1.5 then 'WARNING'
    else 'NORMAL'
  end as stockStatus : String(10)
} where currentStock <= reorderLevel;

view PurchaseOrdersSummary as select from PurchaseOrders {
  material.name as materialName,
  supplier.name as supplierName,
  count(*) as totalOrders : Integer,
  sum(quantity) as totalQuantity : Integer,
  sum(totalAmount) as totalValue : Decimal(15,2),
  avg(aiConfidence) as avgAIConfidence : Decimal(5,2)
} group by material.ID, supplier.ID;
