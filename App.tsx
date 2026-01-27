
import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Loader2, CheckCircle2, AlertCircle, X, Store, Settings, Plus, Trash2, ArrowRight, Copy, Lock, KeyRound } from 'lucide-react';
import { 
  Material, SalesItem, Recipe, SaleEntry,
  MaterialGroup, SalesItemGroup, Restaurant
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
import QuickQueryPage from './components/QuickQueryPage';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');

  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [isManagerMode, setIsManagerMode] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [newRestName, setNewRestName] = useState('');
  const [isCloning, setIsCloning] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'materials' | 'items' | 'recipes' | 'sales' | 'reports' | 'query'>('items');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [salesItemGroups, setSalesItemGroups] = useState<SalesItemGroup[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Initial DB Load
  useEffect(() => {
    const init = async () => {
      await initDb();
      const rests = await db.getRestaurants();
      setRestaurants(rests);
      setIsLoading(false);
    };
    init();
  }, []);

  // Data load per Restaurant
  useEffect(() => {
    if (!currentRestaurant) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [mats, matGrps, items, itemGrps, recs, sls] = await Promise.all([
          db.getMaterials(currentRestaurant.id),
          db.getMaterialGroups(currentRestaurant.id),
          db.getItems(currentRestaurant.id),
          db.getSalesItemGroups(currentRestaurant.id),
          db.getRecipes(currentRestaurant.id),
          db.getSales(currentRestaurant.id)
        ]);
        setMaterials(mats);
        setMaterialGroups(matGrps);
        setSalesItems(items);
        setSalesItemGroups(itemGrps);
        setRecipes(recs);
        setSales(sls);
      } catch (error) {
        addToast("فشل تحميل بيانات المطعم", "error");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentRestaurant, addToast]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '147852') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('رمز الدخول غير صحيح');
      setPin('');
    }
  };

  const handleCreateRestaurant = async () => {
    if (!newRestName.trim()) return;
    const r: Restaurant = { id: crypto.randomUUID(), name: newRestName.trim() };
    await db.saveRestaurant(r);
    setRestaurants(prev => [...prev, r]);
    setNewRestName('');
    addToast(`تم إنشاء مطعم "${r.name}" بنجاح`);
  };

  const handleCloneRestaurant = async (id: string, name: string) => {
    const newName = prompt(`أدخل اسم المطعم الجديد المستنسخ من "${name}":`, `${name} - نسخة`);
    if (!newName || !newName.trim()) return;
    
    setIsCloning(id);
    try {
      const cloned = await db.cloneRestaurant(id, newName.trim());
      setRestaurants(prev => [...prev, cloned]);
      addToast(`تم استنساخ "${name}" إلى "${cloned.name}" بنجاح`);
    } catch (err) {
      addToast("فشل استنساخ المطعم", "error");
    } finally {
      setIsCloning(null);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (confirm("سيتم حذف كافة بيانات المطعم بشكل نهائي! هل أنت متأكد؟")) {
      await db.deleteRestaurant(id);
      setRestaurants(prev => prev.filter(r => r.id !== id));
      addToast("تم حذف المطعم وبياناته");
    }
  };

  const handleAddMaterialGroup = async (g: Omit<MaterialGroup, 'restaurantId'>) => {
    if (!currentRestaurant) return;
    const group = { ...g, restaurantId: currentRestaurant.id };
    await db.saveMaterialGroup(group);
    setMaterialGroups(prev => [...prev, group]);
  };
  const handleDeleteMaterialGroup = async (id: string) => {
    await db.deleteMaterialGroup(id);
    setMaterialGroups(prev => prev.filter(g => g.id !== id));
    setMaterials(prev => prev.map(m => m.groupId === id ? { ...m, groupId: undefined } : m));
  };

  const handleAddSalesItemGroup = async (g: Omit<SalesItemGroup, 'restaurantId'>) => {
    if (!currentRestaurant) return;
    const group = { ...g, restaurantId: currentRestaurant.id };
    await db.saveSalesItemGroup(group);
    setSalesItemGroups(prev => [...prev, group]);
  };
  const handleDeleteSalesItemGroup = async (id: string) => {
    await db.deleteSalesItemGroup(id);
    setSalesItemGroups(prev => prev.filter(g => g.id !== id));
    setSalesItems(prev => prev.map(i => i.groupId === id ? { ...i, groupId: undefined } : i));
  };

  const handleAddMaterial = async (m: Omit<Material, 'restaurantId'>) => {
    if (!currentRestaurant) return;
    const mat = { ...m, restaurantId: currentRestaurant.id };
    await db.saveMaterial(mat);
    setMaterials(prev => [...prev, mat]);
  };
  const handleUpdateMaterial = async (m: Omit<Material, 'restaurantId'>) => {
    if (!currentRestaurant) return;
    const mat: Material = { ...m, restaurantId: currentRestaurant.id };
    await db.saveMaterial(mat);
    setMaterials(prev => prev.map(old => old.id === m.id ? mat : old));
  };
  const handleDeleteMaterial = async (id: string) => {
    await db.deleteMaterial(id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleAddItem = async (i: Omit<SalesItem, 'restaurantId'>) => {
    if (!currentRestaurant) return;
    const item = { ...i, restaurantId: currentRestaurant.id };
    await db.saveItem(item);
    setSalesItems(prev => [...prev, item]);
  };
  const handleUpdateItem = async (i: Omit<SalesItem, 'restaurantId'>) => {
    if (!currentRestaurant) return;
    const item: SalesItem = { ...i, restaurantId: currentRestaurant.id };
    await db.saveItem(item);
    setSalesItems(prev => prev.map(old => old.id === i.id ? item : old));
  };
  const handleDeleteItem = async (id: string) => {
    await db.deleteItem(id);
    setSalesItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSaveRecipe = async (r: Omit<Recipe, 'restaurantId'>) => {
    if (!currentRestaurant) return;
    const recipe = { ...r, restaurantId: currentRestaurant.id };
    await db.saveRecipe(recipe);
    setRecipes(prev => {
      const exists = prev.some(old => old.itemId === recipe.itemId);
      return exists ? prev.map(old => old.itemId === recipe.itemId ? recipe : old) : [...prev, recipe];
    });
    addToast('تم حفظ الوصفة بنجاح');
  };

  const handleDeleteRecipe = async (itemId: string) => {
    if (!currentRestaurant) return;
    await db.deleteRecipe(itemId, currentRestaurant.id);
    setRecipes(prev => prev.filter(r => r.itemId !== itemId));
    addToast('تم حذف الوصفة بنجاح');
  };

  const handleSaveSales = async (entries: Omit<SaleEntry, 'restaurantId'>[]) => {
    if (!currentRestaurant) return;
    const salesWithId = entries.map(e => ({ ...e, restaurantId: currentRestaurant.id }));
    await db.saveSales(salesWithId);
    setSales(prev => [...salesWithId, ...prev]);
    addToast('تم تسجيل المبيعات بنجاح');
  };

  const handleDeleteSale = async (id: string) => {
    await db.deleteSale(id);
    setSales(prev => prev.filter(s => s.id !== id));
    addToast('تم حذف عملية البيع');
  };

  const handleUpdateSale = async (id: string, quantity: number) => {
    await db.updateSale(id, quantity);
    setSales(prev => prev.map(s => s.id === id ? { ...s, quantitySold: quantity } : s));
    addToast('تم تعديل الكمية بنجاح');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <Lock className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">تسجيل الدخول للنظام</h1>
          <p className="text-slate-500 mb-8 text-sm">أدخل رمز الدخول للمتابعة</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <KeyRound className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                maxLength={6}
                placeholder="رمز الدخول (PIN)" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3.5 text-lg font-bold text-center tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
            {authError && <p className="text-rose-500 text-sm font-bold animate-pulse">{authError}</p>}
            <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30">
              دخول
            </button>
          </form>
          <p className="mt-8 text-xs text-slate-400">CulinaTrack v1.2</p>
        </div>
      </div>
    );
  }

  if (isLoading && !currentRestaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="mt-4 font-bold text-slate-600">جاري تهيئة النظام...</p>
      </div>
    );
  }

  // --- Restaurant Selection Screen ---
  if (!currentRestaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10">
            <ChefHat className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800">CulinaTrack</h1>
            <p className="text-slate-500 mt-2">نظام إدارة استهلاك المواد الخام للمطاعم</p>
          </div>

          {!isManagerMode ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setCurrentRestaurant(r)}
                    className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all group text-right"
                  >
                    <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                      <Store className="w-6 h-6 text-emerald-500 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{r.name}</h3>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">دخول للنظام <ArrowRight className="w-3 h-3" /></p>
                  </button>
                ))}
                
                {restaurants.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl text-slate-400">
                    لا يوجد مطاعم مسجلة حالياً
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsManagerMode(true)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-colors"
              >
                <Settings className="w-5 h-5" /> لوحة تحكم المدير (إضافة واستنساخ مطاعم)
              </button>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl shadow-xl animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-800">إدارة المطاعم</h2>
                <button onClick={() => setIsManagerMode(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="اسم المطعم الجديد" 
                    className="flex-1 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newRestName}
                    onChange={(e) => setNewRestName(e.target.value)}
                  />
                  <button 
                    onClick={handleCreateRestaurant}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600"
                  >
                    إضافة مطعم
                  </button>
                </div>

                <div className="divide-y">
                  {restaurants.map(r => (
                    <div key={r.id} className="py-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-slate-400" />
                        <span className="font-bold text-slate-700">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleCloneRestaurant(r.id, r.name)}
                          disabled={isCloning === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors text-sm font-bold disabled:opacity-50"
                          title="استنساخ المطعم"
                        >
                          {isCloning === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                          استنساخ
                        </button>
                        <button 
                          onClick={() => handleDeleteRestaurant(r.id)}
                          className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                          title="حذف المطعم"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'materials':
        return (
          <MaterialsPage 
            materials={materials}
            groups={materialGroups} 
            onAdd={handleAddMaterial} 
            onUpdate={handleUpdateMaterial} 
            onDelete={handleDeleteMaterial}
            onAddGroup={handleAddMaterialGroup}
            onUpdateGroup={(g) => db.saveMaterialGroup({ ...g, restaurantId: currentRestaurant.id })}
            onDeleteGroup={handleDeleteMaterialGroup}
          />
        );
      case 'items':
        return (
          <SalesItemsPage 
            items={salesItems}
            groups={salesItemGroups}
            onAdd={handleAddItem} 
            onUpdate={handleUpdateItem} 
            onDelete={handleDeleteItem} 
            onAddGroup={handleAddSalesItemGroup}
            onUpdateGroup={(g) => db.saveSalesItemGroup({ ...g, restaurantId: currentRestaurant.id })}
            onDeleteGroup={handleDeleteSalesItemGroup}
          />
        );
      case 'recipes':
        return (
          <RecipeBuilderPage 
            items={salesItems} 
            materials={materials} 
            recipes={recipes} 
            onSave={handleSaveRecipe}
            onDelete={handleDeleteRecipe}
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
      case 'query':
        return (
          <QuickQueryPage 
            items={salesItems} 
            materials={materials} 
            recipes={recipes} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden" dir="rtl">
      {isLoading && currentRestaurant && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      )}

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border pointer-events-auto animate-in slide-in-from-top-4 duration-300 ${
              toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'
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
        restaurantName={currentRestaurant.name}
        onExit={() => setCurrentRestaurant(null)}
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
