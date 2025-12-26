
import React, { useState } from 'react';
import { Plus, Trash2, Scale, AlertCircle, Edit3, Save, X } from 'lucide-react';
import { Unit } from '../types';

interface Props {
  units: Unit[];
  onAdd: (u: Unit) => Promise<void>;
  onUpdate: (u: Unit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const UnitsPage: React.FC<Props> = ({ units, onAdd, onUpdate, onDelete }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('يرجى إدخال اسم الوحدة');
    if (units.some(u => u.name.trim() === name.trim())) 
      return setError('هذه الوحدة موجودة بالفعل');

    const newUnit: Unit = { id: crypto.randomUUID(), name: name.trim() };
    await onAdd(newUnit);
    setName('');
  };

  const saveEdit = async (id: string) => {
    setEditError('');
    if (!editName.trim()) return setEditError('الاسم مطلوب');
    if (units.some(u => u.id !== id && u.name.trim() === editName.trim()))
      return setEditError('هذا الاسم مستخدم لوحدة أخرى');

    await onUpdate({ id, name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف وحدة القياس "${name}"؟ سيؤثر ذلك على عرض الوحدات في الخامات المربوطة بها.`)) {
      await onDelete(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <Plus className="w-5 h-5 text-emerald-500" /> إضافة وحدة قياس جديدة
        </h3>
        <form onSubmit={addUnit} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text" placeholder="اسم الوحدة (مثال: ملعقة كبيرة)"
              className={`w-full border ${error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
              value={name} onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
            />
            {error && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
          </div>
          <button className="bg-emerald-500 text-white px-6 py-2 rounded-xl hover:bg-emerald-600 font-bold h-fit transition-transform active:scale-95">إضافة</button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr><th className="px-6 py-4 font-semibold">اسم الوحدة</th><th className="px-6 py-4 font-semibold w-32">إجراءات</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {editingId === u.id ? (
                    <>
                      <td className="px-6 py-3">
                        <div className="space-y-1">
                          <input 
                            type="text" 
                            className={`w-full border ${editError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500`} 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                            autoFocus 
                          />
                          {editError && <p className="text-rose-500 text-[10px]">{editError}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-3 flex gap-2">
                        <button onClick={() => saveEdit(u.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-4 h-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 flex items-center gap-3 dark:text-slate-200"><Scale className="w-4 h-4 text-slate-400" />{u.name}</td>
                      <td className="px-6 py-4 flex gap-1">
                        <button onClick={() => { setEditingId(u.id); setEditName(u.name); setEditError(''); }} className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(u.id, u.name)} className="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-slate-400 dark:text-slate-600 italic">لا توجد وحدات مضافة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnitsPage;
