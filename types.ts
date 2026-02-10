
export interface Restaurant {
  id: string;
  name: string;
  icon?: string;
}

export interface MaterialGroup {
  id: string;
  name: string;
  restaurantId: string;
}

export interface SalesItemGroup {
  id: string;
  name: string;
  restaurantId: string;
}

export interface Unit {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  price?: number; // Cost Price per Unit
  groupId?: string;
  restaurantId: string;
}

export interface SalesItem {
  id: string;
  name: string;
  unit?: string;
  price?: number; // Selling Price
  groupId?: string;
  restaurantId: string;
}

export interface RecipeIngredient {
  materialId?: string; // Optional if using subItemId
  subItemId?: string;   // Optional if using materialId
  quantity: number;
}

export interface Recipe {
  itemId: string;
  ingredients: RecipeIngredient[];
  restaurantId: string;
}

export interface SaleEntry {
  id: string;
  itemId: string;
  quantitySold: number;
  date: string;
  referenceNumber?: string; // Added reference number for grouping batches
  timestamp?: number; // Creation timestamp
  restaurantId: string;
}

export interface AggregatedReportItem {
  materialName: string;
  unit: string;
  totalConsumption: number;
  totalCost: number; // Added Cost
}

export interface DetailedReportItem {
  itemName: string;
  quantitySold: number;
  totalRevenue: number; // Added Revenue
  totalCost: number; // Added Cost
  ingredients: {
    materialName: string;
    unit: string;
    consumedQuantity: number;
    cost: number; // Ingredient Cost
  }[];
}
