const cds = require('@sap/cds');
const fs = require('fs');
const path = require('path');

async function loadCSVData() {
  try {
    console.log('🚀 Loading CSV data into database...');
    
    // Connect to database
    const db = await cds.connect.to('db');
    
    // Clear existing data first
    console.log('🧹 Clearing existing data...');
    await db.run('DELETE FROM ai_mm_Materials');
    await db.run('DELETE FROM ai_mm_Suppliers');
    await db.run('DELETE FROM ai_mm_MaterialCategories');
    await db.run('DELETE FROM ai_mm_SystemConfig');
    
    // Load Categories
    console.log('📂 Loading Material Categories...');
    const categoriesCSV = fs.readFileSync('db/src/csv/ai.mm-MaterialCategories.csv', 'utf8');
    const categoryLines = categoriesCSV.split('\n').filter(line => line.trim() && !line.startsWith('ID;'));
    
    for (const line of categoryLines) {
      const [ID, name, description, isActive] = line.split(';');
      if (ID && name) {
        await db.run(`INSERT INTO ai_mm_MaterialCategories (ID, name, description, isActive) VALUES (?, ?, ?, ?)`,
          [ID, name, description, isActive === 'true' ? 1 : 0]);
      }
    }
    console.log(`✅ Loaded ${categoryLines.length} categories`);
    
    // Load Suppliers
    console.log('🏢 Loading Suppliers...');
    const suppliersCSV = fs.readFileSync('db/src/csv/ai.mm-Suppliers.csv', 'utf8');
    const supplierLines = suppliersCSV.split('\n').filter(line => line.trim() && !line.startsWith('ID;'));
    
    for (const line of supplierLines) {
      const [ID, name, contactPerson, email, phone, address, city, country, rating, isActive, paymentTerms, deliveryTerms] = line.split(';');
      if (ID && name) {
        await db.run(`INSERT INTO ai_mm_Suppliers (ID, name, contactPerson, email, phone, address, city, country, rating, isActive, paymentTerms, deliveryTerms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ID, name, contactPerson, email, phone, address, city, country, parseFloat(rating), isActive === 'true' ? 1 : 0, paymentTerms, deliveryTerms]);
      }
    }
    console.log(`✅ Loaded ${supplierLines.length} suppliers`);
    
    // Load Materials
    console.log('📦 Loading Materials...');
    const materialsCSV = fs.readFileSync('db/src/csv/ai.mm-Materials.csv', 'utf8');
    const materialLines = materialsCSV.split('\n').filter(line => line.trim() && !line.startsWith('ID;'));
    
    for (const line of materialLines) {
      const parts = line.split(';');
      if (parts.length >= 18 && parts[0] && parts[1]) {
        const [ID, name, description, category_ID, currentStock, reorderLevel, maxStock, minStock, 
               unitOfMeasure, unitPrice, currency_code, supplier_ID, leadTime, safetyStock, 
               location, barcode, isActive, lastStockUpdate] = parts;
        
        await db.run(`INSERT INTO ai_mm_Materials (
          ID, name, description, category_ID, currentStock, reorderLevel, maxStock, minStock,
          unitOfMeasure, unitPrice, currency_code, supplier_ID, leadTime, safetyStock,
          location, barcode, isActive, lastStockUpdate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          ID, name, description, category_ID, 
          parseInt(currentStock), parseInt(reorderLevel), parseInt(maxStock), parseInt(minStock),
          unitOfMeasure, parseFloat(unitPrice), currency_code, supplier_ID, 
          parseInt(leadTime), parseInt(safetyStock), location, barcode,
          isActive === 'true' ? 1 : 0, lastStockUpdate || null
        ]);
      }
    }
    console.log(`✅ Loaded ${materialLines.length} materials`);
    
    // Add System Config
    console.log('⚙️ Loading System Config...');
    await db.run(`INSERT INTO ai_mm_SystemConfig (ID, configKey, configValue, description, isActive) VALUES 
      ('1', 'AI_SERVICE_URL', 'http://localhost:5000', 'URL for AI prediction service', 1),
      ('2', 'DEFAULT_CONSUMPTION_RATE', '5', 'Default daily consumption rate', 1),
      ('3', 'STOCK_ALERT_THRESHOLD', '0.8', 'Threshold for stock alerts', 1)`);
    
    console.log('✅ CSV data loading completed successfully!');
    
    // Verify the data
    const materialCount = await db.run('SELECT COUNT(*) as count FROM ai_mm_Materials');
    const categoryCount = await db.run('SELECT COUNT(*) as count FROM ai_mm_MaterialCategories');
    const supplierCount = await db.run('SELECT COUNT(*) as count FROM ai_mm_Suppliers');
    
    console.log(`📊 Final counts:`);
    console.log(`   - Materials: ${materialCount[0]?.count || 0}`);
    console.log(`   - Categories: ${categoryCount[0]?.count || 0}`);
    console.log(`   - Suppliers: ${supplierCount[0]?.count || 0}`);
    
  } catch (error) {
    console.error('❌ Error loading CSV data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  loadCSVData()
    .then(() => {
      console.log('🎉 CSV data loading completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 CSV data loading failed:', error);
      process.exit(1);
    });
}

module.exports = { loadCSVData };
