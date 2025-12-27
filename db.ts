
import { createClient } from "@libsql/client";
import { Material, SalesItem, Recipe, SaleEntry, MaterialGroup, SalesItemGroup } from './types';

const client = createClient({
  url: "libsql://inventory-cal-muhammedalameen.aws-us-west-2.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjY3NTMwNDUsImlkIjoiOTI3NzQ3ODEtZmI0Yy00MDYzLThiNTgtMDYyMzFhZGZlNWRkIiwicmlkIjoiNTdiM2M5YjAtMWU1NS00MWJhLWFiYjgtMDJlZWQ3ZTM1NzRmIn0.2-Up3Y1Ius_1ZLaOewccUrP7tvSdFM9nTrEIAcOuOl6RGER9e5lfoSMIeKlKJSCEeIn1ef96R2J5qmvYbPCIDw"
});

export const initDb = async () => {
  try {
    await client.batch([
      "CREATE TABLE IF NOT EXISTS material_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS sales_item_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, name TEXT, unit TEXT, group_id TEXT)",
      "CREATE TABLE IF NOT EXISTS sales_items (id TEXT PRIMARY KEY, name TEXT, group_id TEXT)",
      "CREATE TABLE IF NOT EXISTS recipes (item_id TEXT, material_id TEXT, quantity REAL, PRIMARY KEY (item_id, material_id))",
      "CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, item_id TEXT, quantity_sold INTEGER, sale_date TEXT)"
    ], "write");
    
    // Cleanup old units table if it exists (Optional, but keeps DB clean)
    // await client.execute("DROP TABLE IF EXISTS units");
  } catch (error) {
    console.error("Database Init Error:", error);
  }
};

export const db = {
  // Material Groups
  getMaterialGroups: async (): Promise<MaterialGroup[]> => {
    const rs = await client.execute("SELECT * FROM material_groups ORDER BY name");
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string }));
  },
  saveMaterialGroup: async (g: MaterialGroup) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO material_groups (id, name) VALUES (?, ?)",
      args: [g.id, g.name]
    });
  },
  deleteMaterialGroup: async (id: string) => {
    await client.batch([
      { sql: "UPDATE materials SET group_id = NULL WHERE group_id = ?", args: [id] },
      { sql: "DELETE FROM material_groups WHERE id = ?", args: [id] }
    ], "write");
  },

  // Sales Item Groups
  getSalesItemGroups: async (): Promise<SalesItemGroup[]> => {
    const rs = await client.execute("SELECT * FROM sales_item_groups ORDER BY name");
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string }));
  },
  saveSalesItemGroup: async (g: SalesItemGroup) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO sales_item_groups (id, name) VALUES (?, ?)",
      args: [g.id, g.name]
    });
  },
  deleteSalesItemGroup: async (id: string) => {
    await client.batch([
      { sql: "UPDATE sales_items SET group_id = NULL WHERE group_id = ?", args: [id] },
      { sql: "DELETE FROM sales_item_groups WHERE id = ?", args: [id] }
    ], "write");
  },

  // Materials
  getMaterials: async (): Promise<Material[]> => {
    const rs = await client.execute("SELECT * FROM materials ORDER BY name");
    return rs.rows.map(row => ({ 
      id: row.id as string, 
      name: row.name as string, 
      unit: row.unit as string,
      groupId: row.group_id as string || undefined
    }));
  },
  saveMaterial: async (m: Material) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO materials (id, name, unit, group_id) VALUES (?, ?, ?, ?)",
      args: [m.id, m.name, m.unit, m.groupId || null]
    });
  },
  deleteMaterial: async (id: string) => {
    await client.execute({ sql: "DELETE FROM materials WHERE id = ?", args: [id] });
  },

  // Sales Items
  getItems: async (): Promise<SalesItem[]> => {
    const rs = await client.execute("SELECT * FROM sales_items ORDER BY name");
    return rs.rows.map(row => ({ 
      id: row.id as string, 
      name: row.name as string,
      groupId: row.group_id as string || undefined
    }));
  },
  saveItem: async (i: SalesItem) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO sales_items (id, name, group_id) VALUES (?, ?, ?)",
      args: [i.id, i.name, i.groupId || null]
    });
  },
  deleteItem: async (id: string) => {
    await client.batch([
      { sql: "DELETE FROM sales_items WHERE id = ?", args: [id] },
      { sql: "DELETE FROM recipes WHERE item_id = ?", args: [id] }
    ], "write");
  },

  // Recipes
  getRecipes: async (): Promise<Recipe[]> => {
    const rs = await client.execute("SELECT * FROM recipes");
    const grouped: Record<string, Recipe> = {};
    rs.rows.forEach(row => {
      const itemId = row.item_id as string;
      if (!grouped[itemId]) grouped[itemId] = { itemId, ingredients: [] };
      grouped[itemId].ingredients.push({
        materialId: row.material_id as string,
        quantity: row.quantity as number
      });
    });
    return Object.values(grouped);
  },
  saveRecipe: async (recipe: Recipe) => {
    const queries = [
      { sql: "DELETE FROM recipes WHERE item_id = ?", args: [recipe.itemId] },
      ...recipe.ingredients.map(ing => ({
        sql: "INSERT INTO recipes (item_id, material_id, quantity) VALUES (?, ?, ?)",
        args: [recipe.itemId, ing.materialId, ing.quantity]
      }))
    ];
    await client.batch(queries, "write");
  },

  // Sales
  getSales: async (): Promise<SaleEntry[]> => {
    const rs = await client.execute("SELECT id, item_id as itemId, quantity_sold as quantitySold, sale_date as date FROM sales ORDER BY sale_date DESC");
    return rs.rows.map(row => ({
      id: row.id as string,
      itemId: row.itemId as string,
      quantitySold: row.quantitySold as number,
      date: row.date as string
    }));
  },
  saveSales: async (newSales: SaleEntry[]) => {
    const queries = newSales.map(s => ({
      sql: "INSERT INTO sales (id, item_id, quantity_sold, sale_date) VALUES (?, ?, ?, ?)",
      args: [s.id, s.itemId, s.quantitySold, s.date]
    }));
    await client.batch(queries, "write");
  },
  deleteSale: async (id: string) => {
    await client.execute({ sql: "DELETE FROM sales WHERE id = ?", args: [id] });
  },
  updateSale: async (id: string, quantity: number) => {
    await client.execute({
      sql: "UPDATE sales SET quantity_sold = ? WHERE id = ?",
      args: [quantity, id]
    });
  }
};
