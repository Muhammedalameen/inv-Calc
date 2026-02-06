
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calculator, Save, Package, UtensilsCrossed, ArrowRightLeft, Info, ChefHat, Printer, Edit3, ArrowRight, Search, FileText } from 'lucide-react';
import { SalesItem, Material, Recipe, RecipeIngredient } from '../types';

interface Props {
  items: SalesItem[];
  materials: Material[];
  recipes: Recipe[];
  onSave: (recipe: Omit<Recipe, 'restaurantId'>) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
}

interface LocalRecipeIngredient extends Omit<RecipeIngredient, 'quantity'> {
  quantity: string | number;
}

interface PrintData {
  itemName: string;
  itemUnit: string;
  ingredients: LocalRecipeIngredient[];
}

const RecipeBuilderPage: React.FC<Props> = ({ items, materials, recipes, onSave, onDelete }) => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [localIngredients, setLocalIngredients] = useState<LocalRecipeIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dedicated state for printing to allow printing from list view without changing main selection
  const [printData, setPrintData] = useState<PrintData | null>(null);

  // When selectedItemId changes (in edit mode), load existing recipe or reset
  useEffect(() => {
    if (view === 'edit' && selectedItemId) {
      const existing = recipes.find(r => r.itemId === selectedItemId);
      setLocalIngredients(existing ? existing.ingredients.map(i => ({...i})) : []);
    }
  }, [selectedItemId, recipes, view]);

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
    
    const ingredientsToSave: RecipeIngredient[] = localIngredients.map(ing => ({
      materialId: ing.materialId,
      subItemId: ing.subItemId,
      quantity: typeof ing.quantity === 'string' ? parseFloat(ing.quantity) || 0 : ing.quantity
    }));

    await onSave({ itemId: selectedItemId, ingredients: ingredientsToSave });
    setIsSaving(false);
    setView('list');
    setSelectedItemId('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الوصفة بالكامل؟')) {
      if (onDelete) await onDelete(id);
    }
  };

  // Helper to trigger print from anywhere
  const triggerPrint = (name: string, unit: string, ingredients: LocalRecipeIngredient[]) => {
    setPrintData({ itemName: name, itemUnit: unit, ingredients: ingredients.map(i => ({...i})) });
    setTimeout(() => window.print(), 100);
  };

  // Logic for List View
  const recipesList = useMemo(() => {
    return recipes.map(r => {
      const item = items.find(i => i.id === r.itemId);
      return { ...r, itemName: item?.name || 'صنف محذوف', itemUnit: item?.unit || '-' };
    }).filter(r => r.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [recipes, items, searchTerm]);

  const selectedItem = items.find(i => i.id === selectedItemId);
  const selectedItemName = selectedItem?.name;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header / Breadcrumbs */}
      {view === 'edit' && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 print:hidden">
          <button onClick={() => setView('list')} className="hover:text-emerald-600 flex items-center gap-1 transition-colors">
            <ArrowRight className="w-4 h-4" /> العودة للقائمة
          </button>
          <span>/</span>
          <span className="font-bold text-slate-800 dark:text-white">تعديل الوصفة</span>
        </div>
      )}

      {/* VIEW: LIST */}
      {view === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                 <ChefHat className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-white">سجل الوصفات الفنية</h2>
                 <p className="text-sm text-slate-500">إدارة مكونات ومقادير الأصناف</p>
              </div>
            </div>
            <button 
              onClick={() => { setSelectedItemId(''); setLocalIngredients([]); setView('edit'); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" /> إنشاء وصفة جديدة
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="بحث عن وصفة..." 
                  className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">اسم الصنف</th>
                    <th className="px-6 py-4">عدد المكونات</th>
                    <th className="px-6 py-4">وحدة القياس</th>
                    <th className="px-6 py-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recipesList.length > 0 ? (
                    recipesList.map(recipe => (
                      <tr key={recipe.itemId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{recipe.itemName}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">
                            {recipe.ingredients.length} مكونات
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{recipe.itemUnit}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                             <button 
                              onClick={() => triggerPrint(recipe.itemName, recipe.itemUnit, recipe.ingredients as LocalRecipeIngredient[])}
                              className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                              title="طباعة الوصفة"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setSelectedItemId(recipe.itemId); setView('edit'); }}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل الوصفة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(recipe.itemId)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف الوصفة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-8 h-8 opacity-20" />
                          <p>لا توجد وصفات مسجلة تطابق بحثك</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* VIEW: EDIT */
        <div className="print:hidden space-y-6">
          {!selectedItemId && (
             <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">اختيار الصنف لإنشاء الوصفة</h3>
               <div className="max-w-md mx-auto">
                 <select
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-colors"
                  value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  <option value="">-- اختر صنفاً من القائمة --</option>
                  {items.filter(i => !recipes.some(r => r.itemId === i.id)).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-2">تظهر هنا فقط الأصناف التي ليس لها وصفة مسجلة بعد.</p>
               </div>
             </div>
          )}

          {selectedItemId && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-2 transition-colors">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 gap-4">
                <div>
                   <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                    <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
                    {selectedItemName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">قم بإضافة المكونات والمقادير لهذا الصنف</p>
                </div>
                <div className="flex flex-wrap gap-2">
                   <button onClick={() => addIngredient('material')} className="flex items-center gap-2 text-xs bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors"><Package className="w-3.5 h-3.5" /> إضافة خامة</button>
                   <button onClick={() => addIngredient('item')} className="flex items-center gap-2 text-xs bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"><ChefHat className="w-3.5 h-3.5" /> إضافة صنف مجهز</button>
                   <button 
                    onClick={() => {
                       const item = items.find(i => i.id === selectedItemId);
                       if (item) triggerPrint(item.name, item.unit || '-', localIngredients);
                    }}
                    className="flex items-center gap-2 text-xs bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> طباعة
                  </button>
                   <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 text-sm bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:bg-slate-300 transition-all hover:scale-105 active:scale-95"><Save className="w-4 h-4" /> {isSaving ? 'جاري الحفظ...' : 'حفظ الوصفة'}</button>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {localIngredients.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    <Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>لا توجد مكونات مضافة بعد.</p>
                  </div>
                ) : (
                  localIngredients.map((ing, idx) => {
                    const isSubItem = !!ing.subItemId;
                    const material = materials.find(m => m.id === ing.materialId);
                    const item = items.find(i => i.id === ing.subItemId);
                    const unit = isSubItem ? (item?.unit || 'وحدة') : material?.unit;
                    const subRecipe = isSubItem ? getSubItemRecipe(ing.subItemId!) : null;

                    return (
                      <div key={idx} className={`flex flex-col md:flex-row gap-4 items-start p-4 rounded-xl border transition-all group ${
                        isSubItem 
                          ? 'bg-blue-50/40 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/40' 
                          : 'bg-white border-slate-200 dark:bg-slate-800/30 dark:border-slate-700 hover:border-emerald-200'
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
                            <button onClick={() => toggleType(idx)} className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
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
                              <div className="relative group/tooltip">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg cursor-help hover:bg-blue-200 transition-colors">
                                  <Info className="w-4 h-4" />
                                </div>
                                <div className="invisible group-hover/tooltip:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-white p-3 rounded-xl shadow-2xl border border-slate-700 pointer-events-none">
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
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="w-full md:w-48">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 mr-1">الكمية لكل {unit}</label>
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
      )}

      {/* Printable View - Always Rendered but hidden */}
      {printData && (
        <div className="hidden print:block bg-white p-8">
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
            <h1 className="text-3xl font-bold mb-4">بطاقة وصفة فنية</h1>
            <div className="flex justify-center items-center gap-6">
               <h2 className="text-2xl font-bold text-slate-800 border-2 border-slate-800 px-4 py-1 rounded-lg">
                 الصنف: {printData.itemName}
               </h2>
               <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 px-4 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-slate-500">الوحدة المنتجة:</span>
                  <span className="font-bold text-lg">{printData.itemUnit || 'غير محدد'}</span>
               </div>
            </div>
          </div>

          <table className="w-full text-right border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="py-3 px-4 text-sm font-bold text-slate-700 border-b border-slate-300 w-1/4">النوع</th>
                <th className="py-3 px-4 text-sm font-bold text-slate-700 border-b border-slate-300">المكون</th>
                <th className="py-3 px-4 text-sm font-bold text-slate-700 border-b border-slate-300 text-center">الكمية</th>
                <th className="py-3 px-4 text-sm font-bold text-slate-700 border-b border-slate-300">وحدة المكون</th>
              </tr>
            </thead>
            <tbody>
              {printData.ingredients.length > 0 ? (
                printData.ingredients.map((ing, idx) => {
                  const isSubItem = !!ing.subItemId;
                  const material = materials.find(m => m.id === ing.materialId);
                  const item = items.find(i => i.id === ing.subItemId);
                  const name = isSubItem ? item?.name : material?.name;
                  const unit = isSubItem ? (item?.unit || 'وحدة') : material?.unit;

                  return (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm">
                         {isSubItem ? (
                           <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold">صنف مجهز</span>
                         ) : (
                           <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-bold">خامة أولية</span>
                         )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{name}</td>
                      <td className="py-3 px-4 font-mono text-lg font-bold text-center">{ing.quantity}</td>
                      <td className="py-3 px-4 text-sm font-bold text-slate-600">{unit}</td>
                    </tr>
                  );
                })
              ) : (
                 <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">لا توجد مكونات مسجلة</td></tr>
              )}
            </tbody>
          </table>
          
          <div className="mt-12 pt-4 border-t-2 border-slate-800 flex justify-between text-xs text-slate-500 font-bold">
             <span>تمت الطباعة من نظام CulinaTrack</span>
             <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeBuilderPage;
