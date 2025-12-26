
import { createClient } from "@libsql/client";
import { Material, SalesItem, Recipe, SaleEntry, Unit } from './types';

// ملاحظة: في بيئة Cloudflare Pages، يفضل وضع هذه القيم في متغيرات بيئة (Environment Variables)
const client = createClient({
  url: "libsql://inventory-cal-muhammedalameen.aws-us-west-2.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjY3NTMwNDUsImlkIjoiOTI3NzQ3ODEtZmI0Yy00MDYzLThiNTgtMDYyMzFhZGZlNWRkIiwicmlkIjoiNTdiM2M5YjAtMWU1NS00MWJhLWFiYjgtMDJlZWQ3ZTM1NzRmIn0.2-Up3Y1Ius_1ZLaOewccUrP7tvSdFM9nTrEIAcOuOl6RGER9e5lfoSMIeKlKJSCEeIn1ef96R2J5qmvYbPCIDw"
});

export const initDb = async () => {
  try {
    await client.batch([
      "CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, name TEXT, unit TEXT)",
      "CREATE TABLE IF NOT EXISTS sales_items (id TEXT PRIMARY KEY, name TEXT)",
      "CREATE TABLE IF NOT EXISTS recipes (item_id TEXT, material_id TEXT, quantity REAL, PRIMARY KEY (item_id, material_id))",
      "CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, item_id TEXT, quantity_sold INTEGER, sale_date TEXT)"
    ], "write");

    const checkUnits = await client.execute("SELECT count(*) as count FROM units");
    if (Number(checkUnits.rows[0].count) === 0) {
      const defaultUnits = ['كجم', 'جرام', 'لتر', 'مل', 'حبة', 'كرتون', 'كيس'];
      const seedQueries = defaultUnits.map(u => ({
        sql: "INSERT INTO units (id, name) VALUES (?, ?)",
        args: [crypto.randomUUID(), u]
      }));
      await client.batch(seedQueries, "write");
    }
  } catch (error) {
    console.error("Database Init Error:", error);
  }
};

export const db = {
  // Units
  getUnits: async (): Promise<Unit[]> => {
    const rs = await client.execute("SELECT * FROM units ORDER BY name");
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string }));
  },
  saveUnit: async (u: Unit) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO units (id, name) VALUES (?, ?)",
      args: [u.id, u.name]
    });
  },
  deleteUnit: async (id: string) => {
    await client.execute({ sql: "DELETE FROM units WHERE id = ?", args: [id] });
  },

  // Materials
  getMaterials: async (): Promise<Material[]> => {
    const rs = await client.execute("SELECT * FROM materials ORDER BY name");
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string, unit: row.unit as string }));
  },
  saveMaterial: async (m: Material) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO materials (id, name, unit) VALUES (?, ?, ?)",
      args: [m.id, m.name, m.unit]
    });
  },
  deleteMaterial: async (id: string) => {
    await client.execute({ sql: "DELETE FROM materials WHERE id = ?", args: [id] });
  },

  // Sales Items
  getItems: async (): Promise<SalesItem[]> => {
    const rs = await client.execute("SELECT * FROM sales_items ORDER BY name");
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string }));
  },
  saveItem: async (i: SalesItem) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO sales_items (id, name) VALUES (?, ?)",
      args: [i.id, i.name]
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
