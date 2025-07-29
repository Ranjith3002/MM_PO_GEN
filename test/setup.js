// Jest setup file
const cds = require('@sap/cds');

// Set test environment
process.env.NODE_ENV = 'test';

// Configure CDS for testing
cds.env.requires.db = {
  kind: 'sqlite',
  credentials: { url: ':memory:' }
};

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
});

afterAll(async () => {
  // Cleanup
  await cds.shutdown();
});
