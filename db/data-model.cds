namespace ai.mm;

entity Materials {
  key ID       : UUID;
  name         : String;
  currentStock : Integer;
  reorderLevel : Integer;
  supplier     : String;
  leadTime     : Integer;
}

entity PurchaseOrders {
  key ID          : UUID;
  material        : Association to Materials;
  quantity        : Integer;
  suggestedByAI   : Boolean;
  orderDate       : Date;
  deliveryDate    : Date;
}
