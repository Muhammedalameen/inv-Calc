
export interface MaterialGroup {
  id: string;
  name: string;
}

export interface SalesItemGroup {
  id: string;
  name: string;
}

// Unit interface required by UnitsPage.tsx
export interface Unit {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string; // Now manually entered
  groupId?: string;
}

export interface SalesItem {
  id: string;
  name: string;
  groupId?: string;
}

export interface RecipeIngredient {
  materialId: string;
  quantity: number; // Quantity of material per 1 unit of sales item
}

export interface Recipe {
  itemId: string;
  ingredients: RecipeIngredient[];
}

export interface SaleEntry {
  id: string;
  itemId: string;
  quantitySold: number;
  date: string;
}

export interface AggregatedReportItem {
  materialName: string;
  unit: string;
  totalConsumption: number;
}

export interface DetailedReportItem {
  itemName: string;
  quantitySold: number;
  ingredients: {
    materialName: string;
    unit: string;
    consumedQuantity: number;
  }[];
}