
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, AlertCircle, Save } from 'lucide-react';
import { SalesItem, Material, Recipe, RecipeIngredient } from '../types';

interface Props {
  items: SalesItem[];
  materials: Material[];
  recipes: Recipe[];
  onSave: (recipe: Recipe) => Promise<void>;
}

const RecipeBuilderPage: React.FC<Props> = ({ items, materials, recipes, onSave }) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [localIngredients, setLocalIngredients] = useState<RecipeIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const existing = recipes.find(r => r.itemId === selectedItemId);
    setLocalIngredients(existing ? [...existing.ingredients] : []);
  }, [selectedItemId, recipes]);

  const addIngredient = () => {
    if (!selectedItemId || materials.length === 0) return;
    setLocalIngredients([...localIngredients, { materialId: materials[0].id, quantity: 0 }]);
  };

  const updateIngredient = (idx: number, field: keyof RecipeIngredient, value: string | number) => {
    const next = [...localIngredients];
    if (field === 'quantity') next[idx].quantity = parseFloat(String(value)) || 0;
    else next[idx].materialId = String(value);
    setLocalIngredients(next);
  };

  const removeIngredient = (idx: number) => {
    setLocalIngredients(localIngredients.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ itemId: selectedItemId, ingredients: localIngredients });
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">اختر صنف المبيعات لتعديل وصفته:</label>
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
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-white">وصفة: <span className="text-emerald-600 dark:text-emerald-400">{items.find(i => i.id === selectedItemId)?.name}</span></h3>
            <div className="flex gap-2">
               <button onClick={addIngredient} className="flex items-center gap-2 text-sm bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition-colors"><Plus className="w-4 h-4" /> إضافة خامة</button>
               <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 text-sm bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:bg-slate-300 dark:disabled:bg-slate-800 transition-all hover:scale-105 active:scale-95"><Save className="w-4 h-4" /> {isSaving ? 'جاري الحفظ...' : 'حفظ الوصفة'}</button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {localIngredients.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-600"><Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>لا توجد خامات مضافة لهذه الوصفة بعد.</p></div>
            ) : (
              localIngredients.map((ing, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-4 items-start bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 mb-1 mr-1">الخامة</label>
                    <select className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" value={ing.materialId} onChange={(e) => updateIngredient(idx, 'materialId', e.target.value)}>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 mb-1 mr-1">الكمية لكل وحدة مباعة</label>
                    <input type="number" step="0.001" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white font-mono font-bold transition-colors" value={ing.quantity || ''} onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)} />
                  </div>
                  <button onClick={() => removeIngredient(idx)} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl md:mt-5 self-end"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeBuilderPage;
