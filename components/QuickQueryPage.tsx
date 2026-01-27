
import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, Package, ArrowLeftRight, Search, UtensilsCrossed, Info, ChefHat, Layers } from 'lucide-react';
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
      return { materialName: mat?.name || 'خامة مجهولة', unit: mat?.unit || '', total: totalQty };
    });
  }, [selectedItemId, queryQuantity, materials, resolveFlattenedIngredients]);

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
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">الاستعلام الذكي عن الاستهلاك</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">تحليل المكونات المجهزة وتفكيكها إلى خامات أولية</p>
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
                     <h4 className="font-bold text-slate-800 dark:text-white text-base">الخامات النهائية المستهلكة (التفكيك الكامل)</h4>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400">إجمالي كميات المواد الخام الأصلية المطلوبة بعد تحليل كافة الوصفات الفرعية</p>
                   </div>
                </div>
                <div className="relative group">
                   <Info className="w-5 h-5 text-slate-400 cursor-help" />
                   <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white rounded-xl text-[10px] shadow-2xl z-50">
                     يتم في هذا الجدول حساب صافي المواد الخام المطلوبة للكمية المحددة، من خلال الدخول في عمق كل صنف مجهز وتحويله لمكوناته الخام.
                   </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">اسم المادة الخام</th>
                      <th className="px-6 py-4 text-left">إجمالي الكمية الصافية</th>
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
                        <td className="px-6 py-4 text-left">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                            {res.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                          </span>
                          <span className="mr-1.5 text-xs text-slate-400 font-bold uppercase">{res.unit}</span>
                        </td>
                      </tr>
                    ))}
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
              <p className="text-sm text-rose-600 dark:text-rose-500 mt-1 max-w-sm">يرجى الذهاب إلى صفحة "إدارة الوصفات" لإعداد مكونات هذا الصنف أولاً ليتمكن النظام من تحليل الاستهلاك.</p>
            </div>
          </div>
        )
      ) : (
        <div className="bg-slate-100/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 py-32 rounded-3xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-sm">
            <Search className="w-12 h-12 opacity-20" />
          </div>
          <p className="font-bold text-lg">اختر صنفاً مبيعات لبدء تحليل الاستهلاك الفعلي</p>
        </div>
      )}
    </div>
  );
};

export default QuickQueryPage;
