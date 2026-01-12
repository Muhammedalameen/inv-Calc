
import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, Package, ArrowLeftRight, Search, UtensilsCrossed, Info } from 'lucide-react';
import { SalesItem, Material, Recipe } from '../types';

interface Props {
  items: SalesItem[];
  materials: Material[];
  recipes: Recipe[];
}

const QuickQueryPage: React.FC<Props> = ({ items, materials, recipes }) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [queryQuantity, setQueryQuantity] = useState<string | number>(1);

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

  const getRecipeStructure = (itemId: string) => {
    const recipe = recipes.find(r => r.itemId === itemId);
    if (!recipe) return null;
    return recipe.ingredients.map(ing => {
      if (ing.materialId) {
        const mat = materials.find(m => m.id === ing.materialId);
        return { name: mat?.name, qty: ing.quantity, unit: mat?.unit, type: 'material' };
      } else {
        const item = items.find(i => i.id === ing.subItemId);
        return { name: item?.name, qty: ing.quantity, unit: 'وحدة', type: 'item' };
      }
    });
  };

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId), [items, selectedItemId]);
  const itemRecipe = useMemo(() => recipes.find(r => r.itemId === selectedItemId), [recipes, selectedItemId]);

  const calculationResults = useMemo(() => {
    if (!selectedItemId) return [];
    const qty = typeof queryQuantity === 'string' ? parseFloat(queryQuantity) || 0 : queryQuantity;
    const flattened = resolveFlattenedIngredients(selectedItemId, qty);
    
    return Object.entries(flattened).map(([matId, totalQty]) => {
      const mat = materials.find(m => m.id === matId);
      return {
        materialId: matId,
        materialName: mat?.name || 'خامة غير معروفة',
        unit: mat?.unit || '',
        totalRequired: totalQty
      };
    });
  }, [selectedItemId, queryQuantity, materials, resolveFlattenedIngredients]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500 p-2 rounded-lg"><Calculator className="w-6 h-6 text-white" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">حاسبة الاستهلاك التقديري (المتداخلة)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">تحليل تلقائي لكافة مكونات الوصفات المجهزة والخامات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mr-1">الصنف الرئيسي</label>
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mr-1">الكمية المطلوبة</label>
            <input
              type="number" min="0.001" step="any"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold transition-colors"
              value={queryQuantity}
              onChange={(e) => setQueryQuantity(e.target.value)}
              placeholder="مثال: 10"
            />
          </div>
        </div>
      </div>

      {selectedItemId ? (
        itemRecipe ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* TOOLTIP CONTAINER */}
                <div className="relative group">
                   <div className="cursor-help bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full hover:bg-blue-200 transition-colors">
                     <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                   </div>
                   <div className="invisible group-hover:visible absolute z-[100] bottom-full right-0 mb-3 w-72 bg-slate-800 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                     <p className="font-bold border-b border-slate-700 pb-2 mb-2 text-blue-300 text-sm">مكونات {selectedItem?.name}:</p>
                     <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {getRecipeStructure(selectedItemId)?.map((ing, i) => (
                          <li key={i} className="flex justify-between items-center gap-2 text-[11px]">
                            <span className="flex items-center gap-2 truncate">
                              {ing.type === 'item' ? <UtensilsCrossed className="w-3 h-3 text-emerald-400 shrink-0" /> : <Package className="w-3 h-3 text-slate-400 shrink-0" />}
                              <span className="truncate">{ing.name}</span>
                            </span>
                            <span className="font-mono text-blue-200 whitespace-nowrap bg-slate-700/50 px-1.5 py-0.5 rounded">{ing.qty} {ing.unit}</span>
                          </li>
                        ))}
                     </ul>
                     <div className="mt-2 pt-2 border-t border-slate-700 text-[9px] text-slate-400 italic">
                       * تظهر الكميات لكل وحدة واحدة من الصنف
                     </div>
                   </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">الخامات النهائية لـ {queryQuantity} وحدة</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">تحليل المكونات المجهزة لـ {selectedItem?.name}</p>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 flex items-center gap-1">
                <UtensilsCrossed className="w-3.5 h-3.5" /> تحليل كامل
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                  <tr>
                    <th className="px-6 py-4">الخامة الأساسية</th>
                    <th className="px-6 py-4 text-left">إجمالي الكمية الصافية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculationResults.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          <span className="font-bold text-slate-700 dark:text-slate-200">{res.materialName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">
                          {res.totalRequired.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                        </span>
                        <span className="mr-1.5 text-xs text-slate-400 font-bold">{res.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>تم تفكيك كافة الوصفات المجهزة إلى خاماتها الأولية بنجاح.</span>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-8 rounded-2xl flex flex-col items-center gap-4 animate-in shake duration-500">
            <UtensilsCrossed className="w-12 h-12 text-rose-500" />
            <div className="text-center">
              <h4 className="font-bold text-rose-800 dark:text-rose-400">وصفة غير مكتملة</h4>
              <p className="text-sm text-rose-600 dark:text-rose-500 mt-1">يجب عليك إعداد وصفة للصنف "{selectedItem?.name}" أولاً.</p>
            </div>
          </div>
        )
      ) : (
        <div className="bg-slate-100/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-4">
          <Search className="w-16 h-16 opacity-10" />
          <p className="font-medium">اختر صنفاً من القائمة لبدء حساب الاستهلاك التقديري</p>
        </div>
      )}
    </div>
  );
};

export default QuickQueryPage;
