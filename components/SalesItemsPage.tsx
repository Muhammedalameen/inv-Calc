
import React, { useState } from 'react';
import { Plus, Trash2, Utensils, AlertCircle, Edit3, Save, X, FolderPlus, Tags } from 'lucide-react';
import { SalesItem, SalesItemGroup } from '../types';

interface Props {
  items: SalesItem[];
  groups: SalesItemGroup[];
  onAdd: (i: SalesItem) => Promise<void>;
  onUpdate: (i: SalesItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddGroup: (g: SalesItemGroup) => Promise<void>;
  onUpdateGroup: (g: SalesItemGroup) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
}

const SalesItemsPage: React.FC<Props> = ({ 
  items, groups, onAdd, onUpdate, onDelete, 
  onAddGroup, onUpdateGroup, onDeleteGroup 
}) => {
  const [name, setName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroupId, setEditGroupId] = useState<string>('');

  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupManager, setShowGroupManager] = useState(false);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('يرجى إدخال اسم الصنف');
    if (items.some(i => i.name.trim().toLowerCase() === name.trim().toLowerCase())) return setError('هذا الصنف موجود بالفعل');

    await onAdd({ 
      id: crypto.randomUUID(), 
      name: name.trim(),
      groupId: selectedGroupId || undefined
    });
    setName('');
    setError('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdate({ 
      id, 
      name: editName.trim(),
      groupId: editGroupId || undefined
    });
    setEditingId(null);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await onAddGroup({ id: crypto.randomUUID(), name: newGroupName.trim() });
    setNewGroupName('');
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الصنف "${name}"؟`)) {
      await onDelete(id);
    }
  };

  const groupedItems = groups.reduce((acc, group) => {
    acc[group.id] = items.filter(i => i.groupId === group.id);
    return acc;
  }, {} as Record<string, SalesItem[]>);

  const ungroupedItems = items.filter(i => !i.groupId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Utensils className="w-6 h-6 text-emerald-500" /> قائمة أصناف المبيعات
        </h3>
        <button 
          onClick={() => setShowGroupManager(!showGroupManager)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            showGroupManager ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          {showGroupManager ? 'إغلاق إدارة المجموعات' : 'إدارة مجموعات الأصناف'}
        </button>
      </div>

      {showGroupManager && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Tags className="w-4 h-4 text-emerald-500" /> إدارة مجموعات الأصناف (المنيو)
          </h4>
          <form onSubmit={handleAddGroup} className="flex gap-2 mb-6">
            <input 
              type="text" placeholder="اسم مجموعة المنيو (مثال: الوجبات الرئيسية، المشروبات)"
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
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <Plus className="w-5 h-5 text-emerald-500" /> إضافة صنف مبيعات جديد
        </h3>
        <form onSubmit={addItem} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text" placeholder="اسم الصنف (مثال: برجر دجاج)"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white"
              value={name} onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
          </div>
          <div className="w-full md:w-64">
            <select
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">بدون مجموعة</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <button className="bg-emerald-500 text-white px-8 py-2.5 rounded-xl hover:bg-emerald-600 font-bold h-fit shadow-lg shadow-emerald-500/20 transition-all active:scale-95">إضافة الصنف</button>
        </form>
      </div>

      <div className="space-y-6">
        {[...groups, { id: 'ungrouped', name: 'أصناف غير مصنفة' }].map(group => {
          const groupItems = group.id === 'ungrouped' ? ungroupedItems : groupedItems[group.id] || [];
          if (groupItems.length === 0) return null;

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
                    {groupItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        {editingId === item.id ? (
                          <>
                            <td className="px-6 py-3">
                              <input type="text" className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-emerald-500" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                            </td>
                            <td className="px-6 py-3 w-48">
                              <select className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-2 py-1 outline-none" value={editGroupId} onChange={(e) => setEditGroupId(e.target.value)}>
                                <option value="">بدون مجموعة</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            </td>
                            <td className="px-6 py-3 flex justify-end gap-2">
                              <button onClick={() => saveEdit(item.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 flex items-center gap-3">
                              <Utensils className="w-4 h-4 text-slate-300" />
                              <span className="font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                            </td>
                            <td className="px-6 py-4 w-48">
                              {/* Empty for symmetry */}
                            </td>
                            <td className="px-6 py-4 flex justify-end gap-1">
                              <button onClick={() => { setEditingId(item.id); setEditName(item.name); setEditGroupId(item.groupId || ''); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
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

        {items.length === 0 && (
          <div className="bg-slate-100/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-4">
            <Utensils className="w-16 h-16 opacity-10" />
            <p className="font-medium">قائمة الأصناف فارغة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesItemsPage;
