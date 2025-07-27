using ai.mm as mm from '../db/data-model';

service POService {
  entity Materials      as projection on mm.Materials;
  entity PurchaseOrders as projection on mm.PurchaseOrders;

  action generatePO(materialID: UUID) returns PurchaseOrders;
  action predictDepletion(materialID: UUID) returns String;
}
