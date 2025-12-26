
import React, { useState } from 'react';
import { Save, History, ShoppingCart, AlertCircle, Loader2, Trash2, Edit3, X, Check } from 'lucide-react';
import { SalesItem, SaleEntry } from '../types';

interface Props {
  items: SalesItem[];
  sales: SaleEntry[];
  onSave: (newSales: SaleEntry[]) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onUpdateSale: (id: string, quantity: number) => Promise<void>;
}

const SalesEntryPage: React.FC<Props> = ({ items, sales, onSave, onDeleteSale, onUpdateSale }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  
  // States for editing history
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  // Filter sales for the selected date
  const existingSalesForDate = sales.filter(s => s.date === date);

  const handleSave = async () => {
    const entries = Object.entries(quantities) as [string, number][];
    const validEntries = entries.filter(([_, qty]) => qty > 0);
    if (validEntries.length === 0) return alert('يرجى إدخال كمية مباعة لواحد على الأقل');

    setIsSaving(true);
    const newSales: SaleEntry[] = validEntries.map(([itemId, qty]) => ({
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      quantitySold: qty,
      date
    }));
    
    await onSave(newSales);
    setQuantities({});
    setIsSaving(false);
    alert('تم حفظ المبيعات بنجاح!');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه العملية؟')) {
      await onDeleteSale(id);
    }
  };

  const startEdit = (sale: SaleEntry) => {
    setEditingSaleId(sale.id);
    setEditQuantity(sale.quantitySold);
  };

  const cancelEdit = () => {
    setEditingSaleId(null);
  };

  const saveEdit = async (id: string) => {
    if (editQuantity < 0) return alert('الكمية يجب أن تكون 0 أو أكثر');
    await onUpdateSale(id, editQuantity);
    setEditingSaleId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Date and Input Form */}
      <section className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" /> إدخال مبيعات جديدة
            </h3>
            <p className="text-sm text-slate-500">أدخل الكميات المباعة للتاريخ المختار</p>
          </div>
          <input 
            type="date" 
            className="border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
            value={date} 
            onChange={(e) => {
              setDate(e.target.value);
              setQuantities({}); // Clear form on date change
            }} 
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">اسم الصنف</th>
                <th className="px-6 py-4 font-semibold w-48 text-center">الكمية المباعة الآن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-700">{item.name}</td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      min="0" 
                      placeholder="0" 
                      className="w-full text-center border rounded-xl px-4 py-2 font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500" 
                      value={quantities[item.id] || ''} 
                      onChange={(e) => setQuantities({...quantities, [item.id]: parseInt(e.target.value) || 0})} 
                    />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400">لا توجد أصناف مبيعات مدخلة</td></tr>
              )}
            </tbody>
          </table>
          <div className="p-6 bg-slate-50 border-t flex justify-end">
            <button 
              onClick={handleSave} 
              disabled={isSaving || (Object.values(quantities) as number[]).every(q => q <= 0)} 
              className="flex items-center gap-2 bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:bg-slate-300 transition-all hover:scale-[1.02] active:scale-95"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} حفظ المبيعات
            </button>
          </div>
        </div>
      </section>

      {/* History Section for Selected Date */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-800">سجل مبيعات يوم: {date}</h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
              <tr>
                <th className="px-6 py-3 font-semibold">الصنف</th>
                <th className="px-6 py-3 font-semibold text-center">الكمية المسجلة</th>
                <th className="px-6 py-3 font-semibold w-32 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {existingSalesForDate.length > 0 ? (
                existingSalesForDate.map((sale) => {
                  const item = items.find(i => i.id === sale.itemId);
                  const isEditing = editingSaleId === sale.id;

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700">{item?.name || 'صنف محذوف'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-24 text-center border-2 border-emerald-500 rounded-lg py-1 font-bold outline-none"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                            autoFocus
                          />
                        ) : (
                          <span className="font-mono font-bold text-slate-600">{sale.quantitySold}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button 
                                onClick={() => saveEdit(sale.id)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="حفظ"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={cancelEdit}
                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                title="إلغاء"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => startEdit(sale)}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="تعديل"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(sale.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="حذف"
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
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">
                    لا توجد عمليات مسجلة لهذا التاريخ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SalesEntryPage;
