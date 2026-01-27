
import React, { useState, useMemo, useRef } from 'react';
import { Save, History, ShoppingCart, Loader2, Trash2, Edit3, X, Check, Plus, Calendar, Filter, Search, Printer, FileText, Hash, Eye, Clock, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { SalesItem, SaleEntry } from '../types';

interface Props {
  items: SalesItem[];
  sales: SaleEntry[];
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
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');
  
  // Entry State
  const [rows, setRows] = useState<NewSaleRow[]>([{ tempId: crypto.randomUUID(), itemId: '', quantity: 0 }]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  
  // History State
  const [filterStartDate, setFilterStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterItemId, setFilterItemId] = useState('');
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [expandedRefs, setExpandedRefs] = useState<string[]>([]);

  // Printing State
  const [printData, setPrintData] = useState<{ref: string, date: string, items: SaleEntry[]} | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // --- Printing Logic ---
  const handlePrintBatch = (refNumber: string, date: string, batchItems: SaleEntry[]) => {
    setPrintData({ ref: refNumber, date, items: batchItems });
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // --- Entry Logic ---
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
    // Generate a simple reference number: #INV-{Random 6 digits}
    const referenceNumber = `#INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const timestamp = Date.now();

    try {
      const newEntries = validRows.map(r => ({
        id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
        itemId: r.itemId,
        quantitySold: r.quantity,
        date,
        referenceNumber,
        timestamp
      }));
      
      await onSave(newEntries);
      setRows([{ tempId: crypto.randomUUID(), itemId: '', quantity: 0 }]);
      alert(`تم حفظ الفاتورة بنجاح: ${referenceNumber}`);
      setActiveTab('history'); // Switch to history to see the new invoice
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBatch = async (refNumber: string, batchItems: SaleEntry[]) => {
    if (confirm(`هل أنت متأكد من حذف الفاتورة بالكامل (${refNumber})؟ سيتم حذف ${batchItems.length} صنف.`)) {
      for (const item of batchItems) {
        await onDeleteSale(item.id);
      }
    }
  };

  const toggleExpand = (ref: string) => {
    setExpandedRefs(prev => 
      prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
    );
  };

  // --- History Logic (Grouped by Date then Reference) ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const dateMatch = s.date >= filterStartDate && s.date <= filterEndDate;
      const itemMatch = filterItemId ? s.itemId === filterItemId : true;
      return dateMatch && itemMatch;
    });
  }, [sales, filterStartDate, filterEndDate, filterItemId]);

  const groupedSales = useMemo(() => {
    // 1. Group by Date
    const byDate: Record<string, SaleEntry[]> = {};
    filteredSales.forEach(sale => {
      if (!byDate[sale.date]) byDate[sale.date] = [];
      byDate[sale.date].push(sale);
    });

    // 2. Sort Dates Descending
    const sortedDates = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));

    // 3. For each Date, Group by Reference Number
    return sortedDates.map(([date, daySales]) => {
      const byRef: Record<string, SaleEntry[]> = {};
      const noRef: SaleEntry[] = [];

      daySales.forEach(s => {
        if (s.referenceNumber) {
          if (!byRef[s.referenceNumber]) byRef[s.referenceNumber] = [];
          byRef[s.referenceNumber].push(s);
        } else {
          noRef.push(s);
        }
      });

      // Sort references by timestamp descending if available
      const sortedRefs = Object.entries(byRef).sort(([, itemsA], [, itemsB]) => {
        const timeA = itemsA[0].timestamp || 0;
        const timeB = itemsB[0].timestamp || 0;
        return timeB - timeA;
      });

      return {
        date,
        sortedRefs,
        noRef
      };
    });
  }, [filteredSales]);

  const startEdit = (sale: SaleEntry) => {
    setEditingSaleId(sale.id);
    setEditQuantity(sale.quantitySold);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Hidden Print Area */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8" ref={printRef}>
        {printData && (
          <div className="max-w-xl mx-auto border border-black p-8">
             <div className="text-center mb-6 border-b border-black pb-4">
               <h1 className="text-2xl font-bold mb-2">فاتورة مبيعات</h1>
               <div className="flex justify-between text-sm mt-4 font-bold">
                 <span>رقم الفاتورة: {printData.ref}</span>
                 <span>التاريخ: {printData.date}</span>
               </div>
             </div>
             <table className="w-full text-right text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="py-2">الصنف</th>
                    <th className="py-2 text-center">الكمية</th>
                    <th className="py-2 text-left">الوحدة</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.items.map(item => {
                    const i = items.find(x => x.id === item.itemId);
                    return (
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="py-2 font-bold">{i?.name}</td>
                        <td className="py-2 text-center font-mono">{item.quantitySold}</td>
                        <td className="py-2 text-left">{i?.unit}</td>
                      </tr>
                    )
                  })}
                </tbody>
             </table>
             <div className="mt-8 pt-4 border-t border-black text-center text-xs">
                تمت الطباعة بواسطة نظام CulinaTrack
             </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit mx-auto md:mx-0 shadow-sm print:hidden">
        <button 
          onClick={() => setActiveTab('entry')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'entry' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> تسجيل مبيعات
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'history' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600'
          }`}
        >
          <History className="w-4 h-4" /> سجل المبيعات
        </button>
      </div>

      {activeTab === 'entry' ? (
        // --- Entry View ---
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 print:hidden">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" /> تاريخ الفاتورة
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">حدد تاريخ عملية البيع (الافتراضي هو اليوم)</p>
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
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">قائمة الأصناف</span>
              <button 
                onClick={addRow}
                className="flex items-center gap-1 text-xs bg-slate-800 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة صف
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              {rows.map((row) => {
                 const item = items.find(i => i.id === row.itemId);
                 return (
                  <div key={row.tempId} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center animate-in fade-in slide-in-from-right-2 duration-200 bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 mr-1">الصنف المباع</label>
                      <select 
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white font-medium"
                        value={row.itemId}
                        onChange={(e) => updateRow(row.tempId, 'itemId', e.target.value)}
                      >
                        <option value="">-- اختر صنفاً --</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-40 relative">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 mr-1">الكمية</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          min="1"
                          placeholder="0"
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white"
                          value={row.quantity || ''}
                          onChange={(e) => updateRow(row.tempId, 'quantity', parseInt(e.target.value) || 0)}
                        />
                        {item?.unit && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded pointer-events-none">
                            {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeRow(row.tempId)}
                      className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors self-end sm:self-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      title="حذف الصف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
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
      ) : (
        // --- History View ---
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 print:hidden">
           {/* Filters */}
           <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-20 z-10 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <Filter className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">تصفية السجل</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">من تاريخ</label>
                  <input type="date" className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">إلى تاريخ</label>
                  <input type="date" className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500">الصنف</label>
                   <select className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2" value={filterItemId} onChange={(e) => setFilterItemId(e.target.value)}>
                     <option value="">جميع الأصناف</option>
                     {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                   </select>
                </div>
              </div>
           </div>

           {/* Grouped Sales List */}
           <div className="space-y-12">
             {groupedSales.length > 0 ? (
               groupedSales.map((dayGroup) => (
                 <div key={dayGroup.date} className="space-y-6">
                    {/* Day Separator */}
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                      <div className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-bold">
                        <Calendar className="w-4 h-4" />
                        {dayGroup.date} ({new Date(dayGroup.date).toLocaleDateString('ar-EG', { weekday: 'long' })})
                      </div>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                    </div>

                    {/* Reference Groups (Orders - Displayed as Summary Cards) */}
                    {dayGroup.sortedRefs.map(([ref, batchItems]) => {
                       const isExpanded = expandedRefs.includes(ref);
                       const createdTime = batchItems[0].timestamp 
                          ? new Date(batchItems[0].timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) 
                          : 'غير مسجل';
                       const totalQty = batchItems.reduce((acc, curr) => acc + curr.quantitySold, 0);

                       return (
                         <div key={ref} className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'}`}>
                           
                           {/* Card Header (Summary) - Always Visible */}
                           <div 
                              className={`p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-4 cursor-pointer select-none ${isExpanded ? 'bg-slate-50 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'}`}
                              onClick={() => toggleExpand(ref)}
                           >
                              {/* Left Side: Invoice Info */}
                              <div className="flex items-center gap-4 w-full md:w-auto">
                                 <div className={`p-3 rounded-xl transition-colors ${isExpanded ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    <Hash className="w-6 h-6" />
                                 </div>
                                 <div className="flex flex-col">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg font-mono tracking-tight">{ref}</h4>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"><Clock className="w-3 h-3"/> {createdTime}</span>
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">إجمالي: {totalQty} وحدة</span>
                                      <span className="text-slate-400">{batchItems.length} صنف</span>
                                    </div>
                                 </div>
                              </div>

                              {/* Right Side: Actions */}
                              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handlePrintBatch(ref, dayGroup.date, batchItems); }}
                                   className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                                   title="طباعة الفاتورة"
                                 >
                                    <Printer className="w-5 h-5" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleDeleteBatch(ref, batchItems); }}
                                   className="p-2.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                                   title="حذف الفاتورة بالكامل"
                                 >
                                    <Trash2 className="w-5 h-5" />
                                 </button>
                                 <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-slate-200' : 'bg-slate-100'}`}>
                                    <ChevronDown className="w-5 h-5 text-slate-600" />
                                 </div>
                              </div>
                           </div>

                           {/* Expanded Content (Details Table) */}
                           {isExpanded && (
                             <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300 origin-top">
                               <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-2 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-800/30">
                                  <Edit3 className="w-3.5 h-3.5" /> يمكنك تعديل الكميات أو حذف أصناف محددة من الأسفل
                               </div>
                               <table className="w-full text-right">
                                 <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold text-[10px] uppercase border-b border-slate-100 dark:border-slate-800">
                                   <tr>
                                     <th className="px-6 py-3 w-1/2">اسم الصنف</th>
                                     <th className="px-6 py-3 text-center">الكمية المباعة</th>
                                     <th className="px-6 py-3 text-center w-32">التحكم</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {batchItems.map(sale => {
                                      const item = items.find(i => i.id === sale.itemId);
                                      const isEditing = editingSaleId === sale.id;
                                      return (
                                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                          <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{item?.name}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-3 text-center">
                                            {isEditing ? (
                                              <input 
                                                type="number" 
                                                className="w-24 text-center border-2 border-emerald-500 rounded-lg px-2 py-1 text-sm font-bold dark:bg-slate-800 dark:text-white outline-none shadow-sm"
                                                value={editQuantity}
                                                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                                                autoFocus
                                              />
                                            ) : (
                                              <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 w-fit mx-auto px-3 py-1 rounded-lg">
                                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{sale.quantitySold}</span>
                                                <span className="text-[10px] text-slate-400">{item?.unit}</span>
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-6 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                              {isEditing ? (
                                                <>
                                                  <button onClick={() => { onUpdateSale(sale.id, editQuantity); setEditingSaleId(null); }} className="text-white bg-emerald-500 hover:bg-emerald-600 p-1.5 rounded-lg shadow-sm transition-colors" title="حفظ"><Check className="w-3.5 h-3.5"/></button>
                                                  <button onClick={() => setEditingSaleId(null)} className="text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 p-1.5 rounded-lg shadow-sm transition-colors" title="إلغاء"><X className="w-3.5 h-3.5"/></button>
                                                </>
                                              ) : (
                                                <>
                                                  <button onClick={() => startEdit(sale)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="تعديل الكمية"><Edit3 className="w-4 h-4"/></button>
                                                  <button onClick={() => { if(confirm('حذف هذا العنصر فقط؟')) onDeleteSale(sale.id); }} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors" title="حذف الصنف"><Trash2 className="w-4 h-4"/></button>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                 </tbody>
                               </table>
                             </div>
                           )}
                         </div>
                       );
                    })}

                    {/* Loose Items (No Ref) */}
                    {dayGroup.noRef.length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
                          <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500">سجلات فردية (بدون فاتورة)</span>
                             </div>
                             <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-bold">{dayGroup.noRef.length} صنف</span>
                          </div>
                          <table className="w-full text-right">
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {dayGroup.noRef.map(sale => {
                                  const item = items.find(i => i.id === sale.itemId);
                                  const isEditing = editingSaleId === sale.id;
                                  return (
                                    <tr key={sale.id} className="hover:bg-white dark:hover:bg-slate-800">
                                      <td className="px-6 py-2 text-sm text-slate-600 dark:text-slate-300">{item?.name}</td>
                                      <td className="px-6 py-2 text-center">
                                         {isEditing ? (
                                            <input type="number" value={editQuantity} onChange={(e) => setEditQuantity(parseInt(e.target.value)||0)} className="w-16 text-center border rounded dark:bg-slate-900 dark:text-white" />
                                         ) : (
                                            <span className="font-mono font-bold text-sm">{sale.quantitySold} <span className="text-[10px] font-normal text-slate-400">{item?.unit}</span></span>
                                         )}
                                      </td>
                                      <td className="px-6 py-2 text-center flex justify-center gap-2">
                                          {isEditing ? (
                                            <button onClick={() => { onUpdateSale(sale.id, editQuantity); setEditingSaleId(null); }} className="text-emerald-500"><Check className="w-3.5 h-3.5"/></button>
                                          ) : (
                                            <button onClick={() => startEdit(sale)} className="text-blue-400"><Edit3 className="w-3.5 h-3.5"/></button>
                                          )}
                                          {!isEditing && <button onClick={() => { if(confirm('حذف؟')) onDeleteSale(sale.id); }} className="text-rose-400"><Trash2 className="w-3.5 h-3.5"/></button>}
                                      </td>
                                    </tr>
                                  )
                                })}
                             </tbody>
                          </table>
                      </div>
                    )}
                 </div>
               ))
             ) : (
               <div className="bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800 py-20 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-4">
                  <Search className="w-12 h-12 opacity-20" />
                  <p className="font-medium">لا توجد سجلات مبيعات تطابق معايير البحث</p>
               </div>
             )}
           </div>
        </section>
      )}
    </div>
  );
};

export default SalesEntryPage;
