
import React, { useState } from 'react';
import { Plus, Trash2, Package, AlertCircle, Edit3, Save, X } from 'lucide-react';
import { Material, Unit } from '../types';

interface Props {
  materials: Material[];
  units: Unit[];
  onAdd: (m: Material) => Promise<void>;
  onUpdate: (m: Material) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MaterialsPage: React.FC<Props> = ({ materials, units, onAdd, onUpdate, onDelete }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState(units[0]?.name || 'كجم');
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editError, setEditError] = useState('');

  // Set default unit when units load
  React.useEffect(() => {
    if (!unit && units.length > 0) setUnit(units[0].name);
  }, [units]);

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('يرجى إدخل اسم الخامة');
    if (materials.some(m => m.name.trim().toLowerCase() === name.trim().toLowerCase())) 
      return setError('هذه الخامة موجودة بالفعل');

    const newMaterial: Material = { id: crypto.randomUUID(), name: name.trim(), unit };
    await onAdd(newMaterial);
    setName('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return setEditError('الاسم مطلوب');
    if (materials.some(m => m.id !== id && m.name.trim().toLowerCase() === editName.trim().toLowerCase()))
      return setEditError('هذا الاسم مستخدم لخامة أخرى');

    await onUpdate({ id, name: editName.trim(), unit: editUnit });
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الخامة "${name}"؟ قد يؤثر ذلك على الوصفات التي تستخدمها.`)) {
      await onDelete(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-500" /> إضافة خامة جديدة
        </h3>
        <form onSubmit={addMaterial} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text" placeholder="اسم الخامة (مثال: لحم بقري)"
                className={`w-full border ${error ? 'border-rose-500' : 'border-slate-200'} rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                value={name} onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
              />
              {error && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
            </div>
            <select
              className="border border-slate-200 rounded-xl px-4 py-2 bg-white outline-none"
              value={unit} onChange={(e) => setUnit(e.target.value)}
            >
              {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              {units.length === 0 && <option value="كجم">كجم</option>}
            </select>
            <button className="bg-emerald-500 text-white px-6 py-2 rounded-xl hover:bg-emerald-600 font-bold">إضافة</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr><th className="px-6 py-4 font-semibold">اسم الخامة</th><th className="px-6 py-4 font-semibold">وحدة القياس</th><th className="px-6 py-4 font-semibold w-32">إجراءات</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materials.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                {editingId === m.id ? (
                  <>
                    <td className="px-6 py-3">
                      <input type="text" className="w-full border rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                    </td>
                    <td className="px-6 py-3">
                      <select className="w-full border rounded-lg px-2 py-1 outline-none" value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
                        {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-3 flex gap-2">
                      <button onClick={() => saveEdit(m.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 flex items-center gap-3"><Package className="w-4 h-4 text-slate-400" />{m.name}</td>
                    <td className="px-6 py-4">{m.unit}</td>
                    <td className="px-6 py-4 flex gap-1">
                      <button onClick={() => { setEditingId(m.id); setEditName(m.name); setEditUnit(m.unit); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m.id, m.name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-400">لا توجد خامات مضافة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialsPage;
