
import React, { useState } from 'react';
import { Plus, Trash2, Utensils, AlertCircle, Edit3, Save, X } from 'lucide-react';
import { SalesItem } from '../types';

interface Props {
  items: SalesItem[];
  onAdd: (i: SalesItem) => Promise<void>;
  onUpdate: (i: SalesItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const SalesItemsPage: React.FC<Props> = ({ items, onAdd, onUpdate, onDelete }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('يرجى إدخال اسم الصنف');
    if (items.some(i => i.name.trim().toLowerCase() === name.trim().toLowerCase())) return setError('هذا الصنف موجود بالفعل');

    await onAdd({ id: crypto.randomUUID(), name: name.trim() });
    setName('');
    setError('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdate({ id, name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الصنف "${name}"؟ سيؤدي ذلك إلى حذف الوصفة المرتبطة به وسجل مبيعاته نهائياً.`)) {
      await onDelete(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-500" /> إضافة صنف مبيعات جديد
        </h3>
        <form onSubmit={addItem} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text" placeholder="اسم الصنف (مثال: برجر كلاسيك)"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={name} onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
          </div>
          <button className="bg-emerald-500 text-white px-6 py-2 rounded-xl hover:bg-emerald-600 font-bold h-fit">إضافة</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr><th className="px-6 py-4 font-semibold">اسم الصنف</th><th className="px-6 py-4 font-semibold w-32">إجراءات</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                {editingId === item.id ? (
                  <>
                    <td className="px-6 py-3">
                      <input type="text" className="w-full border rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                    </td>
                    <td className="px-6 py-3 flex gap-2">
                      <button onClick={() => saveEdit(item.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 flex items-center gap-3"><Utensils className="w-4 h-4 text-slate-400" />{item.name}</td>
                    <td className="px-6 py-4 flex gap-1">
                      <button onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-slate-400">لا توجد أصناف مبيعات مضافة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesItemsPage;
