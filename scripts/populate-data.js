const cds = require('@sap/cds');

async function populateData() {
  try {
    console.log('🚀 Starting data population...');
    
    // Connect to database
    const db = await cds.connect.to('db');
    const { Materials, MaterialCategories, Suppliers, PurchaseOrders, StockMovements, StockPredictions, SystemConfig } = cds.entities;

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await DELETE.from(StockPredictions);
    await DELETE.from(StockMovements);
    await DELETE.from(PurchaseOrders);
    await DELETE.from(Materials);
    await DELETE.from(Suppliers);
    await DELETE.from(MaterialCategories);
    await DELETE.from(SystemConfig);

    // Insert Categories
    console.log('📂 Inserting material categories...');
    await INSERT.into(MaterialCategories).entries([
      { ID: '1', name: 'Raw Materials', description: 'Basic raw materials for production', isActive: true },
      { ID: '2', name: 'Components', description: 'Electronic and mechanical components', isActive: true },
      { ID: '3', name: 'Consumables', description: 'Office and operational consumables', isActive: true },
      { ID: '4', name: 'Tools', description: 'Manufacturing tools and equipment', isActive: true },
      { ID: '5', name: 'Packaging', description: 'Packaging materials and supplies', isActive: true }
    ]);

    // Insert Suppliers
    console.log('🏢 Inserting suppliers...');
    await INSERT.into(Suppliers).entries([
      { ID: '1', name: 'MetalCorp Inc.', contactPerson: 'John Smith', email: 'john.smith@metalcorp.com', phone: '+1-555-0101', address: '123 Industrial Ave', city: 'Detroit', country: 'USA', rating: 4.5, isActive: true, paymentTerms: 'NET30', deliveryTerms: 'FOB' },
      { ID: '2', name: 'AlumTech Ltd.', contactPerson: 'Sarah Johnson', email: 'sarah.j@alumtech.com', phone: '+1-555-0102', address: '456 Tech Blvd', city: 'Toronto', country: 'Canada', rating: 4.2, isActive: true, paymentTerms: 'NET45', deliveryTerms: 'CIF' },
      { ID: '3', name: 'WireTech Solutions', contactPerson: 'Mike Chen', email: 'mike.chen@wiretech.com', phone: '+1-555-0103', address: '789 Wire St', city: 'San Jose', country: 'USA', rating: 4.8, isActive: true, paymentTerms: 'NET15', deliveryTerms: 'DDP' },
      { ID: '4', name: 'PlastiCorp', contactPerson: 'Anna Mueller', email: 'anna.m@plasticorp.de', phone: '+49-30-12345', address: 'Plastic Str. 10', city: 'Berlin', country: 'Germany', rating: 4.0, isActive: true, paymentTerms: 'NET60', deliveryTerms: 'EXW' },
      { ID: '5', name: 'RubberWorks', contactPerson: 'David Brown', email: 'd.brown@rubberworks.co.uk', phone: '+44-20-7890', address: 'Rubber Lane 5', city: 'London', country: 'UK', rating: 3.8, isActive: true, paymentTerms: 'NET30', deliveryTerms: 'FOB' }
    ]);

    // Insert Materials
    console.log('📦 Inserting materials...');
    const materials = [
      { ID: '11111111-1111-1111-1111-111111111111', name: 'Steel Rods', description: 'High-grade steel rods for construction', category_ID: '1', currentStock: 50, reorderLevel: 100, maxStock: 500, minStock: 20, unitOfMeasure: 'PCS', unitPrice: 25.50, currency_code: 'USD', supplier_ID: '1', leadTime: 7, safetyStock: 30, location: 'Warehouse A', barcode: 'SR001', isActive: true },
      { ID: '22222222-2222-2222-2222-222222222222', name: 'Aluminum Sheets', description: 'Lightweight aluminum sheets', category_ID: '1', currentStock: 200, reorderLevel: 150, maxStock: 800, minStock: 50, unitOfMeasure: 'SHT', unitPrice: 15.75, currency_code: 'USD', supplier_ID: '2', leadTime: 5, safetyStock: 40, location: 'Warehouse B', barcode: 'AS002', isActive: true },
      { ID: '33333333-3333-3333-3333-333333333333', name: 'Copper Wire', description: 'Electrical copper wire 12AWG', category_ID: '2', currentStock: 75, reorderLevel: 80, maxStock: 300, minStock: 25, unitOfMeasure: 'MTR', unitPrice: 2.25, currency_code: 'USD', supplier_ID: '3', leadTime: 3, safetyStock: 20, location: 'Warehouse C', barcode: 'CW003', isActive: true },
      { ID: '44444444-4444-4444-4444-444444444444', name: 'Plastic Pellets', description: 'High-density polyethylene pellets', category_ID: '1', currentStock: 300, reorderLevel: 250, maxStock: 1000, minStock: 100, unitOfMeasure: 'KG', unitPrice: 1.85, currency_code: 'USD', supplier_ID: '4', leadTime: 10, safetyStock: 75, location: 'Warehouse D', barcode: 'PP004', isActive: true },
      { ID: '55555555-5555-5555-5555-555555555555', name: 'Rubber Gaskets', description: 'Industrial rubber gaskets', category_ID: '2', currentStock: 25, reorderLevel: 50, maxStock: 200, minStock: 15, unitOfMeasure: 'PCS', unitPrice: 8.90, currency_code: 'USD', supplier_ID: '5', leadTime: 14, safetyStock: 25, location: 'Warehouse E', barcode: 'RG005', isActive: true },
      { ID: '66666666-6666-6666-6666-666666666666', name: 'Titanium Bolts', description: 'High-strength titanium bolts M12', category_ID: '2', currentStock: 15, reorderLevel: 40, maxStock: 150, minStock: 10, unitOfMeasure: 'PCS', unitPrice: 45.00, currency_code: 'USD', supplier_ID: '1', leadTime: 12, safetyStock: 20, location: 'Warehouse A', barcode: 'TB006', isActive: true },
      { ID: '77777777-7777-7777-7777-777777777777', name: 'Carbon Fiber Sheets', description: 'Lightweight carbon fiber composite', category_ID: '1', currentStock: 80, reorderLevel: 120, maxStock: 400, minStock: 30, unitOfMeasure: 'SHT', unitPrice: 125.00, currency_code: 'USD', supplier_ID: '2', leadTime: 8, safetyStock: 35, location: 'Warehouse B', barcode: 'CF007', isActive: true },
      { ID: '88888888-8888-8888-8888-888888888888', name: 'Hydraulic Fluid', description: 'Industrial hydraulic fluid ISO 32', category_ID: '3', currentStock: 45, reorderLevel: 60, maxStock: 200, minStock: 20, unitOfMeasure: 'LTR', unitPrice: 12.50, currency_code: 'USD', supplier_ID: '3', leadTime: 5, safetyStock: 25, location: 'Warehouse C', barcode: 'HF008', isActive: true },
      { ID: '99999999-9999-9999-9999-999999999999', name: 'Ball Bearings', description: 'Precision ball bearings 6205', category_ID: '2', currentStock: 120, reorderLevel: 100, maxStock: 500, minStock: 40, unitOfMeasure: 'PCS', unitPrice: 18.75, currency_code: 'USD', supplier_ID: '4', leadTime: 6, safetyStock: 30, location: 'Warehouse D', barcode: 'BB009', isActive: true },
      { ID: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Welding Electrodes', description: 'E7018 welding electrodes 3.2mm', category_ID: '4', currentStock: 35, reorderLevel: 80, maxStock: 300, minStock: 25, unitOfMeasure: 'KG', unitPrice: 22.00, currency_code: 'USD', supplier_ID: '5', leadTime: 10, safetyStock: 40, location: 'Warehouse E', barcode: 'WE010', isActive: true }
    ];
    
    await INSERT.into(Materials).entries(materials);

    // Insert System Config
    console.log('⚙️ Inserting system configuration...');
    await INSERT.into(SystemConfig).entries([
      { ID: '1', configKey: 'AI_SERVICE_URL', configValue: 'http://localhost:5000', description: 'URL for AI prediction service', isActive: true },
      { ID: '2', configKey: 'DEFAULT_CONSUMPTION_RATE', configValue: '5', description: 'Default daily consumption rate', isActive: true },
      { ID: '3', configKey: 'STOCK_ALERT_THRESHOLD', configValue: '0.8', description: 'Threshold for stock alerts (as ratio of reorder level)', isActive: true },
      { ID: '4', configKey: 'AUTO_PO_GENERATION', configValue: 'true', description: 'Enable automatic PO generation', isActive: true },
      { ID: '5', configKey: 'EMAIL_NOTIFICATIONS', configValue: 'true', description: 'Enable email notifications', isActive: true }
    ]);

    console.log('✅ Data population completed successfully!');
    console.log(`📊 Inserted:`);
    console.log(`   - ${materials.length} Materials`);
    console.log(`   - 5 Material Categories`);
    console.log(`   - 5 Suppliers`);
    console.log(`   - 5 System Configurations`);
    
  } catch (error) {
    console.error('❌ Error populating data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  populateData()
    .then(() => {
      console.log('🎉 Data population script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Data population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateData };
