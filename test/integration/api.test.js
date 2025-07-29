const request = require('supertest');
const cds = require('@sap/cds');
const { expect } = require('chai');

describe('API Integration Tests', () => {
  let app, srv;

  before(async () => {
    // Start the CAP server
    srv = await cds.serve('srv/service.cds').from('db/data-model.cds');
    app = srv.app;
  });

  after(async () => {
    await cds.shutdown();
  });

  describe('Materials API', () => {
    it('should get all materials', async () => {
      const response = await request(app)
        .get('/odata/v4/po/Materials')
        .expect(200);

      expect(response.body).to.have.property('value');
      expect(response.body.value).to.be.an('array');
    });

    it('should get a specific material', async () => {
      // First, get all materials to find a valid ID
      const materialsResponse = await request(app)
        .get('/odata/v4/po/Materials')
        .expect(200);

      if (materialsResponse.body.value.length > 0) {
        const materialId = materialsResponse.body.value[0].ID;
        
        const response = await request(app)
          .get(`/odata/v4/po/Materials(${materialId})`)
          .expect(200);

        expect(response.body).to.have.property('ID');
        expect(response.body.ID).to.equal(materialId);
      }
    });

    it('should create a new material', async () => {
      const newMaterial = {
        name: 'Test Material API',
        description: 'Created via API test',
        currentStock: 100,
        reorderLevel: 50,
        maxStock: 500,
        minStock: 10,
        unitOfMeasure: 'PCS',
        unitPrice: 25.99,
        currency_code: 'USD',
        leadTime: 7,
        safetyStock: 20,
        location: 'Test Warehouse',
        barcode: 'TEST001',
        isActive: true
      };

      const response = await request(app)
        .post('/odata/v4/po/Materials')
        .send(newMaterial)
        .expect(201);

      expect(response.body).to.have.property('ID');
      expect(response.body.name).to.equal(newMaterial.name);
      expect(response.body.currentStock).to.equal(newMaterial.currentStock);
    });

    it('should validate material creation with invalid data', async () => {
      const invalidMaterial = {
        name: 'Invalid Material',
        currentStock: -10, // Invalid negative stock
        reorderLevel: 50,
        leadTime: 7
      };

      await request(app)
        .post('/odata/v4/po/Materials')
        .send(invalidMaterial)
        .expect(400);
    });
  });

  describe('Purchase Orders API', () => {
    it('should get all purchase orders', async () => {
      const response = await request(app)
        .get('/odata/v4/po/PurchaseOrders')
        .expect(200);

      expect(response.body).to.have.property('value');
      expect(response.body.value).to.be.an('array');
    });

    it('should expand material information in purchase orders', async () => {
      const response = await request(app)
        .get('/odata/v4/po/PurchaseOrders?$expand=material')
        .expect(200);

      expect(response.body).to.have.property('value');
      if (response.body.value.length > 0) {
        expect(response.body.value[0]).to.have.property('material');
      }
    });
  });

  describe('Actions API', () => {
    it('should call predictDepletion action', async () => {
      // First get a material ID
      const materialsResponse = await request(app)
        .get('/odata/v4/po/Materials')
        .expect(200);

      if (materialsResponse.body.value.length > 0) {
        const materialId = materialsResponse.body.value[0].ID;
        
        const response = await request(app)
          .post('/odata/v4/po/predictDepletion')
          .send({ materialID: materialId })
          .expect(200);

        expect(response.body).to.have.property('value');
        expect(response.body.value).to.be.a('string');
        expect(response.body.value).to.include('days');
      }
    });

    it('should call generatePO action', async () => {
      // First get a material ID
      const materialsResponse = await request(app)
        .get('/odata/v4/po/Materials')
        .expect(200);

      if (materialsResponse.body.value.length > 0) {
        const materialId = materialsResponse.body.value[0].ID;
        
        const response = await request(app)
          .post('/odata/v4/po/generatePO')
          .send({ materialID: materialId })
          .expect(200);

        expect(response.body).to.have.property('ID');
        expect(response.body).to.have.property('quantity');
        expect(response.body.suggestedByAI).to.be.true;
      }
    });

    it('should handle invalid material ID in actions', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .post('/odata/v4/po/predictDepletion')
        .send({ materialID: invalidId })
        .expect(500); // Should return error for non-existent material
    });
  });

  describe('Analytics Endpoints', () => {
    it('should get materials with low stock', async () => {
      const response = await request(app)
        .get('/odata/v4/po/MaterialsWithLowStock')
        .expect(200);

      expect(response.body).to.have.property('value');
      expect(response.body.value).to.be.an('array');
    });

    it('should get purchase orders summary', async () => {
      const response = await request(app)
        .get('/odata/v4/po/PurchaseOrdersSummary')
        .expect(200);

      expect(response.body).to.have.property('value');
      expect(response.body.value).to.be.an('array');
    });
  });
});
