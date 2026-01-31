
import { createClient } from "@libsql/client";
import { 
  Material, SalesItem, Recipe, SaleEntry, 
  MaterialGroup, SalesItemGroup, Restaurant 
} from './types';

const client = createClient({
  url: "libsql://inventory-cal-muhammedalameen.aws-us-west-2.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjY3NTMwNDUsImlkIjoiOTI3NzQ3ODEtZmI0Yy00MDYzLThiNTgtMDYyMzFhZGZlNWRkIiwicmlkIjoiNTdiM2M5YjAtMWU1NS00MWJhLWFiYjgtMDJlZWQ3ZTM1NzRmIn0.2-Up3Y1Ius_1ZLaOewccUrP7tvSdFM9nTrEIAcOuOl6RGER9e5lfoSMIeKlKJSCEeIn1ef96R2J5qmvYbPCIDw"
});

export const initDb = async () => {
  try {
    // 1. Create tables if they don't exist
    await client.batch([
      "CREATE TABLE IF NOT EXISTS restaurants (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS material_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, restaurant_id TEXT)",
      "CREATE TABLE IF NOT EXISTS sales_item_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, restaurant_id TEXT)",
      "CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, name TEXT, unit TEXT, group_id TEXT, restaurant_id TEXT)",
      "CREATE TABLE IF NOT EXISTS sales_items (id TEXT PRIMARY KEY, name TEXT, unit TEXT, group_id TEXT, restaurant_id TEXT)",
      "CREATE TABLE IF NOT EXISTS recipes (item_id TEXT, material_id TEXT, sub_item_id TEXT, quantity REAL, restaurant_id TEXT)",
      "CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, item_id TEXT, quantity_sold INTEGER, sale_date TEXT, restaurant_id TEXT)"
    ], "write");

    // 2. Migration: Add columns if they were missing from a previous schema version
    const migrateColumn = async (table: string, column: string, type: string) => {
      try {
        await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      } catch (e: any) {
        // Suppress duplicate column errors
        if (!e.message?.toLowerCase().includes("duplicate column name")) {
           // console.warn(e);
        }
      }
    };

    await migrateColumn("material_groups", "restaurant_id", "TEXT");
    await migrateColumn("sales_item_groups", "restaurant_id", "TEXT");
    await migrateColumn("materials", "restaurant_id", "TEXT");
    await migrateColumn("materials", "group_id", "TEXT");
    await migrateColumn("sales_items", "restaurant_id", "TEXT");
    await migrateColumn("sales_items", "group_id", "TEXT");
    await migrateColumn("sales_items", "unit", "TEXT"); // New column for Unit
    await migrateColumn("recipes", "restaurant_id", "TEXT");
    await migrateColumn("recipes", "sub_item_id", "TEXT");
    await migrateColumn("recipes", "material_id", "TEXT");
    await migrateColumn("sales", "restaurant_id", "TEXT");
    await migrateColumn("sales", "reference_number", "TEXT"); // New Reference Number
    await migrateColumn("sales", "timestamp", "INTEGER"); // New Timestamp

    // 3. Create indices for performance
    try {
      await client.execute("CREATE INDEX IF NOT EXISTS idx_recipes_item ON recipes(item_id, restaurant_id)");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_sales_restaurant ON sales(restaurant_id)");
    } catch (indexError) {
      console.error("Index creation error (likely missing columns still):", indexError);
    }
    
  } catch (error) {
    console.error("Database Init Error:", error);
  }
};

export const db = {
  // Restaurants
  getRestaurants: async (): Promise<Restaurant[]> => {
    const rs = await client.execute("SELECT * FROM restaurants ORDER BY name");
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string }));
  },
  saveRestaurant: async (r: Restaurant) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO restaurants (id, name) VALUES (?, ?)",
      args: [r.id, r.name]
    });
  },
  deleteRestaurant: async (id: string) => {
    await client.batch([
      { sql: "DELETE FROM sales WHERE restaurant_id = ?", args: [id] },
      { sql: "DELETE FROM recipes WHERE restaurant_id = ?", args: [id] },
      { sql: "DELETE FROM sales_items WHERE restaurant_id = ?", args: [id] },
      { sql: "DELETE FROM materials WHERE restaurant_id = ?", args: [id] },
      { sql: "DELETE FROM sales_item_groups WHERE restaurant_id = ?", args: [id] },
      { sql: "DELETE FROM material_groups WHERE restaurant_id = ?", args: [id] },
      { sql: "DELETE FROM restaurants WHERE id = ?", args: [id] }
    ], "write");
  },

  // Clone Restaurant Implementation
  cloneRestaurant: async (sourceId: string, newName: string) => {
    const targetId = crypto.randomUUID();
    
    // 1. Create the new restaurant
    await client.execute({
      sql: "INSERT INTO restaurants (id, name) VALUES (?, ?)",
      args: [targetId, newName]
    });

    const materialGroupMap = new Map<string, string>();
    const salesItemGroupMap = new Map<string, string>();
    const materialMap = new Map<string, string>();
    const salesItemMap = new Map<string, string>();

    // 2. Clone Material Groups
    const oldMatGroups = await client.execute({ sql: "SELECT * FROM material_groups WHERE restaurant_id = ?", args: [sourceId] });
    for (const row of oldMatGroups.rows) {
      const newId = crypto.randomUUID();
      materialGroupMap.set(row.id as string, newId);
      await client.execute({
        sql: "INSERT INTO material_groups (id, name, restaurant_id) VALUES (?, ?, ?)",
        args: [newId, row.name, targetId]
      });
    }

    // 3. Clone Sales Item Groups
    const oldItemGroups = await client.execute({ sql: "SELECT * FROM sales_item_groups WHERE restaurant_id = ?", args: [sourceId] });
    for (const row of oldItemGroups.rows) {
      const newId = crypto.randomUUID();
      salesItemGroupMap.set(row.id as string, newId);
      await client.execute({
        sql: "INSERT INTO sales_item_groups (id, name, restaurant_id) VALUES (?, ?, ?)",
        args: [newId, row.name, targetId]
      });
    }

    // 4. Clone Materials
    const oldMaterials = await client.execute({ sql: "SELECT * FROM materials WHERE restaurant_id = ?", args: [sourceId] });
    for (const row of oldMaterials.rows) {
      const newId = crypto.randomUUID();
      materialMap.set(row.id as string, newId);
      
      // Handle potential missing group (undefined -> null)
      const oldGroupId = row.group_id as string;
      const newGroupId = (oldGroupId && materialGroupMap.get(oldGroupId)) || null;

      await client.execute({
        sql: "INSERT INTO materials (id, name, unit, group_id, restaurant_id) VALUES (?, ?, ?, ?, ?)",
        args: [newId, row.name, row.unit, newGroupId, targetId]
      });
    }

    // 5. Clone Sales Items
    const oldItems = await client.execute({ sql: "SELECT * FROM sales_items WHERE restaurant_id = ?", args: [sourceId] });
    for (const row of oldItems.rows) {
      const newId = crypto.randomUUID();
      salesItemMap.set(row.id as string, newId);
      
      // Handle potential missing group (undefined -> null)
      const oldGroupId = row.group_id as string;
      const newGroupId = (oldGroupId && salesItemGroupMap.get(oldGroupId)) || null;

      await client.execute({
        sql: "INSERT INTO sales_items (id, name, unit, group_id, restaurant_id) VALUES (?, ?, ?, ?, ?)",
        args: [newId, row.name, row.unit || null, newGroupId, targetId]
      });
    }

    // 6. Clone Recipes
    const oldRecipes = await client.execute({ sql: "SELECT * FROM recipes WHERE restaurant_id = ?", args: [sourceId] });
    for (const row of oldRecipes.rows) {
      const newItemId = salesItemMap.get(row.item_id as string);
      
      const oldMatId = row.material_id as string;
      const newMatId = (oldMatId && materialMap.get(oldMatId)) || null;

      const oldSubItemId = row.sub_item_id as string;
      const newSubItemId = (oldSubItemId && salesItemMap.get(oldSubItemId)) || null;
      
      if (newItemId) {
        await client.execute({
          sql: "INSERT INTO recipes (item_id, material_id, sub_item_id, quantity, restaurant_id) VALUES (?, ?, ?, ?, ?)",
          args: [newItemId, newMatId, newSubItemId, row.quantity, targetId]
        });
      }
    }

    return { id: targetId, name: newName };
  },

  // Material Groups
  getMaterialGroups: async (restaurantId: string): Promise<MaterialGroup[]> => {
    const rs = await client.execute({
      sql: "SELECT * FROM material_groups WHERE restaurant_id = ? ORDER BY name",
      args: [restaurantId]
    });
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string, restaurantId: row.restaurant_id as string }));
  },
  saveMaterialGroup: async (g: MaterialGroup) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO material_groups (id, name, restaurant_id) VALUES (?, ?, ?)",
      args: [g.id, g.name, g.restaurantId]
    });
  },
  deleteMaterialGroup: async (id: string) => {
    await client.batch([
      { sql: "UPDATE materials SET group_id = NULL WHERE group_id = ?", args: [id] },
      { sql: "DELETE FROM material_groups WHERE id = ?", args: [id] }
    ], "write");
  },

  // Sales Item Groups
  getSalesItemGroups: async (restaurantId: string): Promise<SalesItemGroup[]> => {
    const rs = await client.execute({
      sql: "SELECT * FROM sales_item_groups WHERE restaurant_id = ? ORDER BY name",
      args: [restaurantId]
    });
    return rs.rows.map(row => ({ id: row.id as string, name: row.name as string, restaurantId: row.restaurant_id as string }));
  },
  saveSalesItemGroup: async (g: SalesItemGroup) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO sales_item_groups (id, name, restaurant_id) VALUES (?, ?, ?)",
      args: [g.id, g.name, g.restaurantId]
    });
  },
  deleteSalesItemGroup: async (id: string) => {
    await client.batch([
      { sql: "UPDATE sales_items SET group_id = NULL WHERE group_id = ?", args: [id] },
      { sql: "DELETE FROM sales_item_groups WHERE id = ?", args: [id] }
    ], "write");
  },

  // Materials
  getMaterials: async (restaurantId: string): Promise<Material[]> => {
    const rs = await client.execute({
      sql: "SELECT * FROM materials WHERE restaurant_id = ? ORDER BY name",
      args: [restaurantId]
    });
    return rs.rows.map(row => ({ 
      id: row.id as string, 
      name: row.name as string, 
      unit: row.unit as string,
      groupId: row.group_id as string || undefined,
      restaurantId: row.restaurant_id as string
    }));
  },
  saveMaterial: async (m: Material) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO materials (id, name, unit, group_id, restaurant_id) VALUES (?, ?, ?, ?, ?)",
      args: [m.id, m.name, m.unit, m.groupId || null, m.restaurantId]
    });
  },
  deleteMaterial: async (id: string) => {
    await client.execute({ sql: "DELETE FROM materials WHERE id = ?", args: [id] });
  },

  // Sales Items
  getItems: async (restaurantId: string): Promise<SalesItem[]> => {
    const rs = await client.execute({
      sql: "SELECT * FROM sales_items WHERE restaurant_id = ? ORDER BY name",
      args: [restaurantId]
    });
    return rs.rows.map(row => ({ 
      id: row.id as string, 
      name: row.name as string,
      unit: row.unit as string || undefined,
      groupId: row.group_id as string || undefined,
      restaurantId: row.restaurant_id as string
    }));
  },
  saveItem: async (i: SalesItem) => {
    await client.execute({
      sql: "INSERT OR REPLACE INTO sales_items (id, name, unit, group_id, restaurant_id) VALUES (?, ?, ?, ?, ?)",
      args: [i.id, i.name, i.unit || null, i.groupId || null, i.restaurantId]
    });
  },
  deleteItem: async (id: string) => {
    await client.batch([
      { sql: "DELETE FROM sales_items WHERE id = ?", args: [id] },
      { sql: "DELETE FROM recipes WHERE item_id = ?", args: [id] }
    ], "write");
  },

  // Recipes
  getRecipes: async (restaurantId: string): Promise<Recipe[]> => {
    const rs = await client.execute({
      sql: "SELECT * FROM recipes WHERE restaurant_id = ?",
      args: [restaurantId]
    });
    const grouped: Record<string, Recipe> = {};
    rs.rows.forEach(row => {
      const itemId = row.item_id as string;
      if (!grouped[itemId]) grouped[itemId] = { itemId, ingredients: [], restaurantId: row.restaurant_id as string };
      grouped[itemId].ingredients.push({
        materialId: row.material_id as string || undefined,
        subItemId: row.sub_item_id as string || undefined,
        quantity: row.quantity as number
      });
    });
    return Object.values(grouped);
  },
  saveRecipe: async (recipe: Recipe) => {
    const queries = [
      { sql: "DELETE FROM recipes WHERE item_id = ? AND restaurant_id = ?", args: [recipe.itemId, recipe.restaurantId] },
      ...recipe.ingredients.map(ing => ({
        sql: "INSERT INTO recipes (item_id, material_id, sub_item_id, quantity, restaurant_id) VALUES (?, ?, ?, ?, ?)",
        args: [
          recipe.itemId, 
          ing.materialId || null, 
          ing.subItemId || null, 
          ing.quantity, 
          recipe.restaurantId
        ]
      }))
    ];
    await client.batch(queries, "write");
  },
  deleteRecipe: async (itemId: string, restaurantId: string) => {
    await client.execute({
      sql: "DELETE FROM recipes WHERE item_id = ? AND restaurant_id = ?",
      args: [itemId, restaurantId]
    });
  },

  // Sales
  getSales: async (restaurantId: string): Promise<SaleEntry[]> => {
    const rs = await client.execute({
      sql: "SELECT id, item_id as itemId, quantity_sold as quantitySold, sale_date as date, reference_number as referenceNumber, timestamp, restaurant_id as restaurantId FROM sales WHERE restaurant_id = ? ORDER BY sale_date DESC, timestamp DESC",
      args: [restaurantId]
    });
    return rs.rows.map(row => ({
      id: row.id as string,
      itemId: row.itemId as string,
      quantitySold: row.quantitySold as number,
      date: row.date as string,
      referenceNumber: row.referenceNumber as string || undefined,
      timestamp: row.timestamp as number || undefined,
      restaurantId: row.restaurantId as string
    }));
  },
  saveSales: async (newSales: SaleEntry[]) => {
    const queries = newSales.map(s => ({
      sql: "INSERT INTO sales (id, item_id, quantity_sold, sale_date, reference_number, timestamp, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [s.id, s.itemId, s.quantitySold, s.date, s.referenceNumber || null, s.timestamp || Date.now(), s.restaurantId]
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
