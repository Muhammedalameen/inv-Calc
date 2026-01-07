
import React, { useState } from 'react';
import { Save, History, ShoppingCart, Loader2, Trash2, Edit3, X, Check, Plus, AlertCircle } from 'lucide-react';
import { SalesItem, SaleEntry } from '../types';

interface Props {
  items: SalesItem[];
  sales: SaleEntry[];
  // Fix: onSave handler now expects Omit[] to match parent logic
  onSave: (newSales: Omit<SaleEntry, 'restaurantId'>[]) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onUpdateSale: (id: string, quantity: number) => Promise<void>;
}

interface NewSaleRow {
  tempId: string;
  itemId: string;
  quantity: number;
}

const SalesEntryPage: React.FC<Props> = ({ items, sales, onSave, onDeleteSale, onUpdateSale }) => {
  const [rows, setRows] = useState<NewSaleRow[]>([{ tempId: crypto.randomUUID(), itemId: '', quantity: 0 }]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  const existingSalesForDate = sales.filter(s => s.date === date);

  const addRow = () => {
    setRows([...rows, { tempId: crypto.randomUUID(), itemId: '', quantity: 0 }]);
  };

  const removeRow = (tempId: string) => {
    if (rows.length === 1) {
      setRows([{ tempId: crypto.randomUUID(), itemId: '', quantity: 0 }]);
    } else {
      setRows(rows.filter(r => r.tempId !== tempId));
    }
  };

  const updateRow = (tempId: string, field: keyof NewSaleRow, value: any) => {
    setRows(rows.map(r => r.tempId === tempId ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    const validRows = rows.filter(r => r.itemId && r.quantity > 0);
    if (validRows.length === 0) return alert('يرجى اختيار صنف وإدخال كمية لواحد على الأقل');

    setIsSaving(true);
    try {
      // Fix: Removed explicit : SaleEntry[] type because restaurantId is added by parent
      const newEntries = validRows.map(r => ({
        id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
        itemId: r.itemId,
        quantitySold: r.quantity,
        date
      }));
      
      await onSave(newEntries);
      setRows([{ tempId: crypto.randomUUID(), itemId: '', quantity: 0 }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (sale: SaleEntry) => {
    setEditingSaleId(sale.id);
    setEditQuantity(sale.quantitySold);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* New Sales Form with Dynamic Rows */}
      <section className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" /> تسجيل مبيعات جديدة
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">اختر الأصناف وأدخل الكميات لتاريخ اليوم</p>
          </div>
          <input 
            type="date" 
            className="border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-slate-50 dark:bg-slate-800 dark:text-white" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">تفاصيل المبيعات</span>
            <button 
              onClick={addRow}
              className="flex items-center gap-1 text-xs bg-slate-800 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة صف
            </button>
          </div>
          
          <div className="p-6 space-y-3">
            {rows.map((row) => (
              <div key={row.tempId} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center animate-in fade-in slide-in-from-right-2 duration-200">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 mr-1">الصنف المباع</label>
                  <select 
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white"
                    value={row.itemId}
                    onChange={(e) => updateRow(row.tempId, 'itemId', e.target.value)}
                  >
                    <option value="">-- اختر صنفاً --</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 mr-1">الكمية</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white"
                    value={row.quantity || ''}
                    onChange={(e) => updateRow(row.tempId, 'quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <button 
                  onClick={() => removeRow(row.tempId)}
                  className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                  title="حذف الصف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button 
              onClick={handleSave} 
              disabled={isSaving || rows.every(r => !r.itemId || r.quantity <= 0)} 
              className="flex items-center gap-2 bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-all hover:scale-[1.02] active:scale-95"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} حفظ وإرسال
            </button>
          </div>
        </div>
      </section>

      {/* History Section for Selected Date */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">تاريخ مبيعات يوم: {date}</h3>
          </div>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-bold text-slate-500 dark:text-slate-400">
            عدد السجلات: {existingSalesForDate.length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">اسم الصنف</th>
                  <th className="px-6 py-4 font-bold text-center">الكمية المسجلة</th>
                  <th className="px-6 py-4 font-bold w-32 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {existingSalesForDate.length > 0 ? (
                  existingSalesForDate.map((sale) => {
                    const item = items.find(i => i.id === sale.itemId);
                    const isEditing = editingSaleId === sale.id;

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{item?.name || 'صنف غير معروف'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="w-24 text-center border-2 border-emerald-500 rounded-lg py-1 font-bold outline-none bg-white dark:bg-slate-800 dark:text-white"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                              autoFocus
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">{sale.quantitySold}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button 
                                  onClick={() => { onUpdateSale(sale.id, editQuantity); setEditingSaleId(null); }}
                                  className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  // Fix: Changed setEditingId to setEditingSaleId
                                  onClick={() => setEditingSaleId(null)}
                                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => startEdit(sale)}
                                  className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => { if(confirm('حذف هذه العملية؟')) onDeleteSale(sale.id); }}
                                  className="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 italic">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 opacity-20" />
                        <span>لا توجد مبيعات مسجلة لهذا اليوم حتى الآن</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SalesEntryPage;
