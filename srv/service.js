const axios = require('axios');

module.exports = (srv) => {
  const { Materials, PurchaseOrders } = srv.entities;

  // Action to predict stock depletion
  srv.on('predictDepletion', async (req) => {
    const { materialID } = req.data;
    const mat = await SELECT.one.from(Materials).where({ ID: materialID });
    const result = await axios.post('http://localhost:5000/predict', {
      currentStock: mat.currentStock,
      consumptionRate: 5
    });
    return `Out of stock in ${result.data.daysLeft} days`;
  });

  // Action to generate PO
  srv.on('generatePO', async (req) => {
    const { materialID } = req.data;
    const mat = await SELECT.one.from(Materials).where({ ID: materialID });

    const quantity = mat.reorderLevel * 2;

    const po = await INSERT.into(PurchaseOrders).entries({
      material_ID: materialID,
      quantity,
      suggestedByAI: true,
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + mat.leadTime * 24 * 60 * 60 * 1000)
    });

    return po;
  });
};
