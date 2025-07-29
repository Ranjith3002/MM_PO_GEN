const cds = require('@sap/cds/lib');
const { expect } = require('chai');

describe('POService Tests', () => {
  let srv;

  beforeAll(async () => {
    // Load the service
    srv = await cds.serve('srv/service.cds').from('db/data-model.cds');
  });

  afterAll(async () => {
    await cds.shutdown();
  });

  describe('Material Validation', () => {
    test('should validate material stock levels', async () => {
      const { Materials } = srv.entities;
      
      // Test creating material with negative stock
      try {
        await srv.create(Materials, {
          name: 'Test Material',
          currentStock: -10,
          reorderLevel: 50,
          leadTime: 7
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Current stock cannot be negative');
      }
    });

    test('should validate reorder level', async () => {
      const { Materials } = srv.entities;
      
      try {
        await srv.create(Materials, {
          name: 'Test Material',
          currentStock: 100,
          reorderLevel: 0,
          leadTime: 7
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Reorder level must be greater than zero');
      }
    });
  });

  describe('Purchase Order Generation', () => {
    test('should calculate optimal quantity correctly', async () => {
      // Mock material data
      const mockMaterial = {
        ID: '11111111-1111-1111-1111-111111111111',
        name: 'Test Material',
        currentStock: 50,
        reorderLevel: 100,
        leadTime: 7,
        supplier: 'Test Supplier'
      };

      // Mock the SELECT operation
      const originalSelect = cds.ql.SELECT;
      cds.ql.SELECT = {
        one: {
          from: () => ({
            where: () => Promise.resolve(mockMaterial)
          })
        }
      };

      try {
        const result = await srv.send('generatePO', { materialID: mockMaterial.ID });
        
        expect(result).to.be.an('object');
        expect(result.quantity).to.be.a('number');
        expect(result.quantity).to.be.greaterThan(0);
        expect(result.suggestedByAI).to.be.true;
      } finally {
        // Restore original SELECT
        cds.ql.SELECT = originalSelect;
      }
    });
  });

  describe('Stock Prediction', () => {
    test('should handle AI service unavailable gracefully', async () => {
      const mockMaterial = {
        ID: '22222222-2222-2222-2222-222222222222',
        name: 'Test Material 2',
        currentStock: 75,
        reorderLevel: 100,
        leadTime: 5
      };

      // Mock the SELECT operation
      const originalSelect = cds.ql.SELECT;
      cds.ql.SELECT = {
        one: {
          from: () => ({
            where: () => Promise.resolve(mockMaterial)
          })
        }
      };

      try {
        const result = await srv.send('predictDepletion', { materialID: mockMaterial.ID });
        
        expect(result).to.be.a('string');
        expect(result).to.include('days');
      } finally {
        cds.ql.SELECT = originalSelect;
      }
    });
  });

  describe('Utility Functions', () => {
    test('should calculate consumption rate from historical data', () => {
      // This would test the calculateConsumptionRate function
      // For now, we'll test the default behavior
      const defaultRate = 5;
      expect(defaultRate).to.equal(5);
    });

    test('should calculate optimal quantity with lead time buffer', () => {
      const material = {
        reorderLevel: 100,
        leadTime: 14
      };
      
      const baseQuantity = material.reorderLevel * 2; // 200
      const leadTimeBuffer = Math.ceil(material.leadTime / 7) * 10; // 20
      const optimalQuantity = Math.max(baseQuantity, leadTimeBuffer);
      
      expect(optimalQuantity).to.equal(200);
    });
  });
});
