
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Save, Package, UtensilsCrossed, ArrowRightLeft, Info, ChefHat } from 'lucide-react';
import { SalesItem, Material, Recipe, RecipeIngredient } from '../types';

interface Props {
  items: SalesItem[];
  materials: Material[];
  recipes: Recipe[];
  onSave: (recipe: Omit<Recipe, 'restaurantId'>) => Promise<void>;
}

// Local interface to handle string inputs for decimals during editing
interface LocalRecipeIngredient extends Omit<RecipeIngredient, 'quantity'> {
  quantity: string | number;
}

const RecipeBuilderPage: React.FC<Props> = ({ items, materials, recipes, onSave }) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [localIngredients, setLocalIngredients] = useState<LocalRecipeIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const existing = recipes.find(r => r.itemId === selectedItemId);
    setLocalIngredients(existing ? existing.ingredients.map(i => ({...i})) : []);
  }, [selectedItemId, recipes]);

  const getSubItemRecipe = (subItemId: string) => {
    const recipe = recipes.find(r => r.itemId === subItemId);
    if (!recipe) return null;
    return recipe.ingredients.map(ing => {
      const name = ing.materialId 
        ? materials.find(m => m.id === ing.materialId)?.name 
        : items.find(i => i.id === ing.subItemId)?.name;
      return { name, quantity: ing.quantity };
    });
  };

  const addIngredient = (type: 'material' | 'item') => {
    if (!selectedItemId) return;
    
    if (type === 'material') {
      if (materials.length === 0) return;
      setLocalIngredients([...localIngredients, { materialId: materials[0].id, quantity: '' }]);
    } else {
      if (items.length === 0) return;
      // Filter out the selected item itself to prevent circular reference
      const otherItems = items.filter(i => i.id !== selectedItemId);
      if (otherItems.length === 0) return;
      setLocalIngredients([...localIngredients, { subItemId: otherItems[0].id, quantity: '' }]);
    }
  };

  const updateIngredient = (idx: number, field: keyof LocalRecipeIngredient, value: any) => {
    const next = [...localIngredients];
    // @ts-ignore - dynamic assignment
    next[idx] = { ...next[idx], [field]: value };
    
    // Ensure if we update materialId, subItemId is cleared and vice versa
    if (field === 'materialId') delete next[idx].subItemId;
    if (field === 'subItemId') delete next[idx].materialId;
    
    setLocalIngredients(next);
  };

  const toggleType = (idx: number) => {
    const current = localIngredients[idx];
    const next = [...localIngredients];
    if (current.materialId) {
      const otherItems = items.filter(i => i.id !== selectedItemId);
      next[idx] = { subItemId: otherItems[0]?.id || '', quantity: current.quantity };
    } else {
      next[idx] = { materialId: materials[0]?.id || '', quantity: current.quantity };
    }
    setLocalIngredients(next);
  };

  const removeIngredient = (idx: number) => {
    setLocalIngredients(localIngredients.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!selectedItemId) return;
    setIsSaving(true);
    
    // Parse strings back to numbers for saving
    const ingredientsToSave: RecipeIngredient[] = localIngredients.map(ing => ({
      materialId: ing.materialId,
      subItemId: ing.subItemId,
      quantity: typeof ing.quantity === 'string' ? parseFloat(ing.quantity) || 0 : ing.quantity
    }));

    await onSave({ itemId: selectedItemId, ingredients: ingredientsToSave });
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">اختر الصنف الرئيسي لتعديل وصفته:</label>
        <select
          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-colors"
          value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}
        >
          <option value="">-- اختر صنفاً --</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {selectedItemId && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-2 transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 gap-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              وصفة: <span className="text-emerald-600 dark:text-emerald-400">{items.find(i => i.id === selectedItemId)?.name}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
               <button onClick={() => addIngredient('material')} className="flex items-center gap-2 text-xs bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors"><Package className="w-3.5 h-3.5" /> إضافة خامة</button>
               <button onClick={() => addIngredient('item')} className="flex items-center gap-2 text-xs bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"><ChefHat className="w-3.5 h-3.5" /> إضافة صنف مجهز</button>
               <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 text-sm bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:bg-slate-300 transition-all hover:scale-105 active:scale-95"><Save className="w-4 h-4" /> {isSaving ? 'جاري الحفظ...' : 'حفظ الوصفة'}</button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {localIngredients.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-600"><Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>لا توجد مكونات في هذه الوصفة. ابدأ بإضافة خامات أو أصناف مجهزة.</p></div>
            ) : (
              localIngredients.map((ing, idx) => {
                const isSubItem = !!ing.subItemId;
                const subRecipe = isSubItem ? getSubItemRecipe(ing.subItemId!) : null;

                return (
                  <div key={idx} className={`flex flex-col md:flex-row gap-4 items-start p-4 rounded-xl border transition-all ${
                    isSubItem 
                      ? 'bg-blue-50/40 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/40 shadow-sm' 
                      : 'bg-slate-50/50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800/50'
                  }`}>
                    <div className="flex-1 w-full">
                      <div className="flex items-center justify-between mb-1 mr-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          {isSubItem ? (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <ChefHat className="w-3.5 h-3.5" /> صنف مجهز (وصفة فرعية)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-slate-500" /> خامة أساسية
                            </span>
                          )}
                        </label>
                        <button onClick={() => toggleType(idx)} className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1 font-bold">
                          <ArrowRightLeft className="w-3 h-3" /> تبديل النوع
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <select 
                          className={`w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                            isSubItem ? 'border-blue-200 dark:border-blue-800 font-bold' : 'border-slate-200 dark:border-slate-700'
                          }`} 
                          value={isSubItem ? ing.subItemId : ing.materialId} 
                          onChange={(e) => updateIngredient(idx, isSubItem ? 'subItemId' : 'materialId', e.target.value)}
                        >
                          {isSubItem ? (
                            items.filter(i => i.id !== selectedItemId).map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                          ) : (
                            materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)
                          )}
                        </select>

                        {isSubItem && (
                          <div className="relative group">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg cursor-help hover:bg-blue-200 transition-colors">
                              <Info className="w-4 h-4" />
                            </div>
                            {/* Preview Tooltip */}
                            <div className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-slate-800 text-white p-3 rounded-xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                              <p className="font-bold border-b border-slate-700 pb-1.5 mb-2 text-[10px] text-blue-300">مكونات الصنف المختار:</p>
                              {subRecipe && subRecipe.length > 0 ? (
                                <ul className="space-y-1">
                                  {subRecipe.map((r, i) => (
                                    <li key={i} className="flex justify-between items-center text-[9px] text-slate-300">
                                      <span>{r.name}</span>
                                      <span className="font-mono text-blue-200">{r.quantity}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[9px] italic text-rose-400">لا توجد وصفة مسجلة لهذا الصنف</p>
                              )}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-full md:w-48">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 mr-1">الكمية لكل وحدة</label>
                      <input 
                        type="number" step="any"
                        className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white font-mono font-bold transition-colors ${
                          isSubItem ? 'border-blue-200 dark:border-blue-800' : 'border-slate-200 dark:border-slate-700'
                        }`} 
                        value={ing.quantity} 
                        onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)} 
                        placeholder="0.00"
                      />
                    </div>
                    <button onClick={() => removeIngredient(idx)} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl md:mt-5 self-end transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeBuilderPage;
