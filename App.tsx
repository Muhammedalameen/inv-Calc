
import React, { useState, useEffect } from 'react';
import { ChefHat, Loader2 } from 'lucide-react';
import { 
  Material, 
  SalesItem, 
  Recipe, 
  SaleEntry,
  Unit
} from './types';
import { db, initDb } from './db';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MaterialsPage from './components/MaterialsPage';
import SalesItemsPage from './components/SalesItemsPage';
import RecipeBuilderPage from './components/RecipeBuilderPage';
import SalesEntryPage from './components/SalesEntryPage';
import ReportsPage from './components/ReportsPage';
import UnitsPage from './components/UnitsPage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'materials' | 'items' | 'recipes' | 'sales' | 'reports' | 'units'>('items');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDb();
        const [mats, itemUnits, items, recs, sls] = await Promise.all([
          db.getMaterials(),
          db.getUnits(),
          db.getItems(),
          db.getRecipes(),
          db.getSales()
        ]);
        setMaterials(mats);
        setUnits(itemUnits);
        setSalesItems(items);
        setRecipes(recs);
        setSales(sls);
      } catch (error) {
        console.error("Critical: Could not load data from Turso", error);
        alert("فشل الاتصال بقاعدة بيانات Turso. يرجى التحقق من الاتصال بالإنترنت.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddUnit = async (u: Unit) => {
    await db.saveUnit(u);
    setUnits(prev => [...prev, u].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const handleUpdateUnit = async (updated: Unit) => {
    await db.saveUnit(updated);
    setUnits(prev => prev.map(u => u.id === updated.id ? updated : u).sort((a,b) => a.name.localeCompare(b.name)));
  };

  const handleDeleteUnit = async (id: string) => {
    await db.deleteUnit(id);
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  const handleAddMaterial = async (m: Material) => {
    await db.saveMaterial(m);
    setMaterials(prev => [...prev, m]);
  };

  const handleUpdateMaterial = async (updated: Material) => {
    await db.saveMaterial(updated);
    setMaterials(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleDeleteMaterial = async (id: string) => {
    await db.deleteMaterial(id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleAddItem = async (item: SalesItem) => {
    await db.saveItem(item);
    setSalesItems(prev => [...prev, item]);
  };

  const handleUpdateItem = async (updated: SalesItem) => {
    await db.saveItem(updated);
    setSalesItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDeleteItem = async (id: string) => {
    await db.deleteItem(id);
    setSalesItems(prev => prev.filter(i => i.id !== id));
    setRecipes(prev => prev.filter(r => r.itemId !== id));
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    await db.saveRecipe(recipe);
    setRecipes(prev => {
      const exists = prev.some(r => r.itemId === recipe.itemId);
      if (exists) return prev.map(r => r.itemId === recipe.itemId ? recipe : r);
      return [...prev, recipe];
    });
  };

  const handleSaveSales = async (newSales: SaleEntry[]) => {
    await db.saveSales(newSales);
    setSales(prev => [...newSales, ...prev]);
  };

  const handleDeleteSale = async (id: string) => {
    await db.deleteSale(id);
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSale = async (id: string, quantity: number) => {
    await db.updateSale(id, quantity);
    setSales(prev => prev.map(s => s.id === id ? { ...s, quantitySold: quantity } : s));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <ChefHat className="w-16 h-16 text-emerald-500 animate-bounce" />
        <div className="flex items-center gap-2 text-xl font-bold">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          جاري التحميل...
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'units':
        return (
          <UnitsPage 
            units={units} 
            onAdd={handleAddUnit} 
            onUpdate={handleUpdateUnit} 
            onDelete={handleDeleteUnit} 
          />
        );
      case 'materials':
        return (
          <MaterialsPage 
            materials={materials}
            units={units} 
            onAdd={handleAddMaterial} 
            onUpdate={handleUpdateMaterial} 
            onDelete={handleDeleteMaterial} 
          />
        );
      case 'items':
        return (
          <SalesItemsPage 
            items={salesItems} 
            onAdd={handleAddItem} 
            onUpdate={handleUpdateItem} 
            onDelete={handleDeleteItem} 
          />
        );
      case 'recipes':
        return (
          <RecipeBuilderPage 
            items={salesItems} 
            materials={materials} 
            recipes={recipes} 
            onSave={handleSaveRecipe} 
          />
        );
      case 'sales':
        return (
          <SalesEntryPage 
            items={salesItems} 
            sales={sales} 
            onSave={handleSaveSales} 
            onDeleteSale={handleDeleteSale}
            onUpdateSale={handleUpdateSale}
          />
        );
      case 'reports':
        return (
          <ReportsPage 
            materials={materials} 
            items={salesItems} 
            recipes={recipes} 
            sales={sales} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden" dir="rtl">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab: any) => setActiveTab(tab)} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          activeTab={activeTab} 
          onOpenSidebar={() => setIsSidebarOpen(true)} 
        />
        <main className="p-4 md:p-8 flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
