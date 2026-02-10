
import React, { useState } from 'react';
import { Plus, Trash2, Package, AlertCircle, Edit3, Save, X, FolderPlus, Tags, DollarSign } from 'lucide-react';
import { Material, MaterialGroup } from '../types';

interface Props {
  materials: Material[];
  groups: MaterialGroup[];
  onAdd: (m: Omit<Material, 'restaurantId'>) => Promise<void>;
  onUpdate: (m: Omit<Material, 'restaurantId'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddGroup: (g: Omit<MaterialGroup, 'restaurantId'>) => Promise<void>;
  onUpdateGroup: (g: Omit<MaterialGroup, 'restaurantId'>) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
}

const MaterialsPage: React.FC<Props> = ({ 
  materials, groups, onAdd, onUpdate, onDelete, 
  onAddGroup, onUpdateGroup, onDeleteGroup 
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editGroupId, setEditGroupId] = useState<string>('');

  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupManager, setShowGroupManager] = useState(false);

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('يرجى إدخال اسم الخامة');
    if (!unit.trim()) return setError('يرجى إدخال وحدة القياس');
    if (materials.some(m => m.name.trim().toLowerCase() === name.trim().toLowerCase())) 
      return setError('هذه الخامة موجودة بالفعل');

    const newMaterial = { 
      id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`, 
      name: name.trim(), 
      unit: unit.trim(),
      price: parseFloat(price) || 0,
      groupId: selectedGroupId || undefined
    };
    await onAdd(newMaterial);
    setName('');
    setUnit('');
    setPrice('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim() || !editUnit.trim()) return;
    await onUpdate({ 
      id, 
      name: editName.trim(), 
      unit: editUnit.trim(),
      price: parseFloat(editPrice) || 0,
      groupId: editGroupId || undefined
    });
    setEditingId(null);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await onAddGroup({ id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`, name: newGroupName.trim() });
    setNewGroupName('');
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الخامة "${name}"؟`)) {
      await onDelete(id);
    }
  };

  // Grouped materials logic
  const groupedMaterials = groups.reduce((acc, group) => {
    acc[group.id] = materials.filter(m => m.groupId === group.id);
    return acc;
  }, {} as Record<string, Material[]>);

  const ungroupedMaterials = materials.filter(m => !m.groupId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header with Group Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-emerald-500" /> قائمة الخامات والمستودع
        </h3>
        <button 
          onClick={() => setShowGroupManager(!showGroupManager)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            showGroupManager ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          {showGroupManager ? 'إغلاق إدارة المجموعات' : 'إدارة مجموعات الخامات'}
        </button>
      </div>

      {/* Group Manager Section */}
      {showGroupManager && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Tags className="w-4 h-4 text-emerald-500" /> إدارة مجموعات الخامات
          </h4>
          <form onSubmit={handleAddGroup} className="flex gap-2 mb-6">
            <input 
              type="text" placeholder="اسم المجموعة الجديدة (مثال: بروتينات، خضروات)"
              className="flex-1 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button className="bg-slate-800 text-white px-6 py-2 rounded-xl hover:bg-slate-700 font-bold transition-transform active:scale-95">إضافة مجموعة</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg group">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
                <button 
                  onClick={() => window.confirm('هل تريد حذف هذه المجموعة؟') && onDeleteGroup(g.id)}
                  className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {groups.length === 0 && <p className="text-xs text-slate-400 italic">لا توجد مجموعات حالياً.</p>}
          </div>
        </div>
      )}

      {/* Add Material Form */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <Plus className="w-5 h-5 text-emerald-500" /> إضافة خامة جديدة للمخزون
        </h3>
        <form onSubmit={addMaterial} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <input
              type="text" placeholder="اسم الخامة (مثال: زيت زيتون)"
              className={`w-full border ${error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
              value={name} onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
            />
            {error && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
          </div>
          <div>
            <input
              type="text" placeholder="الوحدة"
              list="common-units"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={unit} onChange={(e) => setUnit(e.target.value)}
            />
            <datalist id="common-units">
              <option value="كجم" /><option value="جرام" /><option value="لتر" /><option value="مل" /><option value="حبة" /><option value="كرتون" />
            </datalist>
          </div>
          <div>
            <input
              type="number" step="0.01" placeholder="سعر التكلفة"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={price} onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">بدون مجموعة</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <button className="md:col-span-5 bg-emerald-500 text-white px-6 py-3 rounded-xl hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95">إضافة الخامة للمستودع</button>
        </form>
      </div>

      {/* Materials Table with Group Sections */}
      <div className="space-y-6">
        {[...groups, { id: 'ungrouped', name: 'خامات غير مصنفة' }].map(group => {
          const groupMaterials = group.id === 'ungrouped' ? ungroupedMaterials : groupedMaterials[group.id] || [];
          if (groupMaterials.length === 0) return null;

          return (
            <div key={group.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2">
                  <Tags className="w-3.5 h-3.5" /> {group.name}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {groupMaterials.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        {editingId === m.id ? (
                          <>
                            <td className="px-6 py-3">
                              <input type="text" className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                            </td>
                            <td className="px-6 py-3 w-32">
                              <input type="text" className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-2 py-1 outline-none" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
                            </td>
                            <td className="px-6 py-3 w-32">
                              <input type="number" step="0.01" className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-2 py-1 outline-none" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                            </td>
                            <td className="px-6 py-3 w-40">
                              <select className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-2 py-1 outline-none" value={editGroupId} onChange={(e) => setEditGroupId(e.target.value)}>
                                <option value="">بدون مجموعة</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            </td>
                            <td className="px-6 py-3 flex justify-end gap-2">
                              <button onClick={() => saveEdit(m.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 flex items-center gap-3">
                              <Package className="w-4 h-4 text-slate-300" />
                              <span className="font-bold text-slate-700 dark:text-slate-200">{m.name}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 w-32 font-medium">
                              {m.unit}
                            </td>
                            <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 w-32 font-bold flex items-center gap-1">
                               {m.price ? m.price.toLocaleString() : '-'} <span className="text-[10px] opacity-60">ر.س</span>
                            </td>
                            <td className="px-6 py-4 w-40">
                              {/* Empty space for consistency if needed */}
                            </td>
                            <td className="px-6 py-4 flex justify-end gap-1">
                              <button onClick={() => { setEditingId(m.id); setEditName(m.name); setEditUnit(m.unit); setEditPrice(m.price?.toString() || ''); setEditGroupId(m.groupId || ''); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(m.id, m.name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {materials.length === 0 && (
          <div className="bg-slate-100/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-4">
            <Package className="w-16 h-16 opacity-10" />
            <p className="font-medium">المستودع خالٍ، ابدأ بإضافة الخامات وتصنيفها</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialsPage;
