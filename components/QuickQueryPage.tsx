
import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, Package, ArrowLeftRight, Search, UtensilsCrossed, Info, ChefHat, Layers, TrendingUp, DollarSign } from 'lucide-react';
import { SalesItem, Material, Recipe } from '../types';

interface Props {
  items: SalesItem[];
  materials: Material[];
  recipes: Recipe[];
}

const QuickQueryPage: React.FC<Props> = ({ items, materials, recipes }) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [queryQuantity, setQueryQuantity] = useState<string | number>(1);

  // Get direct ingredients for the current item
  const getDirectIngredients = (itemId: string) => {
    const recipe = recipes.find(r => r.itemId === itemId);
    if (!recipe) return [];
    return recipe.ingredients;
  };

  // Resolve total raw materials (full recursion)
  const resolveFlattenedIngredients = useCallback((itemId: string, multiplier: number, memo: Record<string, number> = {}, visited: Set<string> = new Set()): Record<string, number> => {
    const recipe = recipes.find(r => r.itemId === itemId);
    if (!recipe || visited.has(itemId)) return memo;

    visited.add(itemId);
    recipe.ingredients.forEach(ing => {
      const totalQty = (ing.quantity || 0) * multiplier;
      if (ing.materialId) {
        memo[ing.materialId] = (memo[ing.materialId] || 0) + totalQty;
      } else if (ing.subItemId) {
        resolveFlattenedIngredients(ing.subItemId, totalQty, memo, visited);
      }
    });
    visited.delete(itemId);
    return memo;
  }, [recipes]);

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId), [items, selectedItemId]);
  const itemRecipe = useMemo(() => recipes.find(r => r.itemId === selectedItemId), [recipes, selectedItemId]);

  const rawMaterialsResults = useMemo(() => {
    if (!selectedItemId) return [];
    const qty = typeof queryQuantity === 'string' ? parseFloat(queryQuantity) || 0 : queryQuantity;
    const flattened = resolveFlattenedIngredients(selectedItemId, qty);
    
    return Object.entries(flattened).map(([matId, totalQty]) => {
      const mat = materials.find(m => m.id === matId);
      const qtyNum = Number(totalQty);
      const cost = (mat?.price || 0) * qtyNum;
      return { materialName: mat?.name || 'خامة مجهولة', unit: mat?.unit || '', total: qtyNum, cost, unitPrice: mat?.price || 0 };
    });
  }, [selectedItemId, queryQuantity, materials, resolveFlattenedIngredients]);

  const economicAnalysis = useMemo(() => {
     const totalCost = rawMaterialsResults.reduce((sum, r) => sum + r.cost, 0);
     const qty = typeof queryQuantity === 'string' ? parseFloat(queryQuantity) || 0 : queryQuantity;
     const sellingPrice = (selectedItem?.price || 0) * qty;
     const profit = sellingPrice - totalCost;
     const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
     
     return { totalCost, sellingPrice, profit, profitMargin };
  }, [rawMaterialsResults, selectedItem, queryQuantity]);

  const directSubItems = useMemo(() => {
    if (!selectedItemId) return [];
    const qty = typeof queryQuantity === 'string' ? parseFloat(queryQuantity) || 0 : queryQuantity;
    const directIngs = getDirectIngredients(selectedItemId);
    
    return directIngs
      .filter(ing => !!ing.subItemId)
      .map(ing => {
        const item = items.find(i => i.id === ing.subItemId);
        return { name: item?.name, qty: ing.quantity * qty, unit: item?.unit || 'وحدة' };
      });
  }, [selectedItemId, queryQuantity, items]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-lg"><Calculator className="w-6 h-6 text-white" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">الاستعلام الذكي وتحليل التكلفة</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">تحليل المكونات وحساب التكلفة التقديرية للإنتاج</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mr-1">الصنف المستهدف</label>
            <select
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              <option value="">-- اختر صنفاً للاستعلام --</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mr-1">الكمية المقدرة</label>
            <input
              type="number" min="0.001" step="any"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold transition-colors"
              value={queryQuantity}
              onChange={(e) => setQueryQuantity(e.target.value)}
            />
          </div>
        </div>
      </div>

      {selectedItemId ? (
        itemRecipe ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Economic Analysis Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Package className="w-4 h-4" /> <span className="text-xs font-bold">إجمالي تكلفة الخامات</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white font-mono">
                  {economicAnalysis.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs opacity-50">ر.س</span>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <DollarSign className="w-4 h-4" /> <span className="text-xs font-bold">سعر البيع المتوقع</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                  {economicAnalysis.sellingPrice > 0 ? economicAnalysis.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'} <span className="text-xs opacity-50">ر.س</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${economicAnalysis.profit >= 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800'}`}>
                <div className={`flex items-center gap-2 mb-2 ${economicAnalysis.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <TrendingUp className="w-4 h-4" /> <span className="text-xs font-bold">الربح التقديري (الهامش)</span>
                </div>
                <div className={`text-2xl font-bold font-mono ${economicAnalysis.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {economicAnalysis.sellingPrice > 0 ? (
                    <>
                       {economicAnalysis.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs opacity-70">({economicAnalysis.profitMargin.toFixed(1)}%)</span>
                    </>
                  ) : (
                    <span className="text-sm">يرجى تحديد سعر البيع</span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Sub-Items Section */}
            {directSubItems.length > 0 && (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/50 overflow-hidden">
                <div className="p-4 bg-blue-100/50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/50 flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-bold text-blue-800 dark:text-blue-300">الأصناف المجهزة الداخلة في التكوين</h4>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {directSubItems.map((sub, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-50 dark:border-slate-700 flex justify-between items-center shadow-sm">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sub.name}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded-lg text-xs">{sub.qty} {sub.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Raw Materials Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                     <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                   </div>
                   <div>
                     <h4 className="font-bold text-slate-800 dark:text-white text-base">تحليل الخامات النهائية والتكلفة</h4>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400">تفصيل الكميات وتكلفة كل خامة بناءً على متوسط سعر الشراء</p>
                   </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">اسم المادة الخام</th>
                      <th className="px-6 py-4 text-center">الكمية الصافية</th>
                      <th className="px-6 py-4 text-center">سعر الوحدة</th>
                      <th className="px-6 py-4 text-left">التكلفة الإجمالية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rawMaterialsResults.map((res, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                            <span className="font-bold text-slate-700 dark:text-slate-200">{res.materialName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                            {res.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                          </span>
                          <span className="mr-1.5 text-[10px] text-slate-400 font-bold">{res.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-mono text-slate-500">
                           {res.unitPrice > 0 ? res.unitPrice.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 text-left">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {res.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="mr-1 text-[10px] opacity-50">ر.س</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={3} className="px-6 py-4 text-slate-600 dark:text-slate-300">الإجمالي الكلي لتكلفة الخامات</td>
                      <td className="px-6 py-4 text-left font-mono text-lg text-emerald-700 dark:text-emerald-400">
                        {economicAnalysis.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs">ر.س</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-12 rounded-3xl flex flex-col items-center gap-4 text-center">
            <UtensilsCrossed className="w-16 h-16 text-rose-500 opacity-50" />
            <div>
              <h4 className="font-bold text-rose-800 dark:text-rose-400 text-lg">لا توجد وصفة مسجلة</h4>
              <p className="text-sm text-rose-600 dark:text-rose-500 mt-1 max-w-sm">يرجى الذهاب إلى صفحة "إدارة الوصفات" لإعداد مكونات هذا الصنف أولاً ليتمكن النظام من تحليل الاستهلاك والتكاليف.</p>
            </div>
          </div>
        )
      ) : (
        <div className="bg-slate-100/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 py-32 rounded-3xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-sm">
            <Search className="w-12 h-12 opacity-20" />
          </div>
          <p className="font-bold text-lg">اختر صنفاً مبيعات لبدء تحليل التكلفة والأرباح</p>
        </div>
      )}
    </div>
  );
};

export default QuickQueryPage;
