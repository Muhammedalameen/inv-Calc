
import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
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

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'materials' | 'items' | 'recipes' | 'sales' | 'reports' | 'units'>('items');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Theme management
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Initial Data Load
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
        addToast("فشل الاتصال بقاعدة البيانات", "error");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [addToast]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const handleAddUnit = async (u: Unit) => {
    await db.saveUnit(u);
    setUnits(prev => [...prev, u].sort((a,b) => a.name.localeCompare(b.name)));
    addToast(`تمت إضافة الوحدة "${u.name}" بنجاح`);
  };

  const handleUpdateUnit = async (updated: Unit) => {
    await db.saveUnit(updated);
    setUnits(prev => prev.map(u => u.id === updated.id ? updated : u).sort((a,b) => a.name.localeCompare(b.name)));
    addToast("تم تحديث الوحدة بنجاح");
  };

  const handleDeleteUnit = async (id: string) => {
    await db.deleteUnit(id);
    setUnits(prev => prev.filter(u => u.id !== id));
    addToast("تم حذف الوحدة");
  };

  const handleAddMaterial = async (m: Material) => {
    await db.saveMaterial(m);
    setMaterials(prev => [...prev, m]);
    addToast(`تمت إضافة الخامة "${m.name}"`);
  };

  const handleUpdateMaterial = async (updated: Material) => {
    await db.saveMaterial(updated);
    setMaterials(prev => prev.map(m => m.id === updated.id ? updated : m));
    addToast("تم تحديث بيانات الخامة");
  };

  const handleDeleteMaterial = async (id: string) => {
    await db.deleteMaterial(id);
    setMaterials(prev => prev.filter(m => m.id !== id));
    addToast("تم حذف الخامة");
  };

  const handleAddItem = async (item: SalesItem) => {
    await db.saveItem(item);
    setSalesItems(prev => [...prev, item]);
    addToast(`تمت إضافة الصنف "${item.name}"`);
  };

  const handleUpdateItem = async (updated: SalesItem) => {
    await db.saveItem(updated);
    setSalesItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    addToast("تم تحديث الصنف");
  };

  const handleDeleteItem = async (id: string) => {
    await db.deleteItem(id);
    setSalesItems(prev => prev.filter(i => i.id !== id));
    setRecipes(prev => prev.filter(r => r.itemId !== id));
    addToast("تم حذف الصنف والوصفة المرتبطة به");
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    await db.saveRecipe(recipe);
    setRecipes(prev => {
      const exists = prev.some(r => r.itemId === recipe.itemId);
      if (exists) return prev.map(r => r.itemId === recipe.itemId ? recipe : r);
      return [...prev, recipe];
    });
    addToast("تم حفظ الوصفة بنجاح");
  };

  const handleSaveSales = async (newSales: SaleEntry[]) => {
    await db.saveSales(newSales);
    setSales(prev => [...newSales, ...prev]);
    addToast(`تم تسجيل ${newSales.length} عملية مبيعات بنجاح`);
  };

  const handleDeleteSale = async (id: string) => {
    await db.deleteSale(id);
    setSales(prev => prev.filter(s => s.id !== id));
    addToast("تم حذف سجل العملية");
  };

  const handleUpdateSale = async (id: string, quantity: number) => {
    await db.updateSale(id, quantity);
    setSales(prev => prev.map(s => s.id === id ? { ...s, quantitySold: quantity } : s));
    addToast("تم تعديل كمية المبيعات");
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-300" dir="rtl">
      {/* Toast Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border pointer-events-auto animate-in slide-in-from-top-4 duration-300 ${
              toast.type === 'success' 
                ? 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-100' 
                : 'bg-rose-50 dark:bg-slate-800 border-rose-100 dark:border-rose-900/30 text-rose-900 dark:text-rose-100'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            <span className="font-bold text-sm">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="mr-4 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

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
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
        <main className="p-4 md:p-8 flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
