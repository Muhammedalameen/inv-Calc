
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Save, History, ShoppingCart, Loader2, Trash2, Edit3, X, Check, Plus, Calendar, Filter, Search, Printer, FileText, Hash, Clock, ChevronDown, FileSpreadsheet, Layers, List, ChefHat } from 'lucide-react';
import { SalesItem, SaleEntry, Material, Recipe } from '../types';

interface Props {
  items: SalesItem[];
  sales: SaleEntry[];
  materials: Material[];
  recipes: Recipe[];
  onSave: (newSales: Omit<SaleEntry, 'restaurantId'>[]) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onUpdateSale: (id: string, quantity: number) => Promise<void>;
}

interface NewSaleRow {
  tempId: string;
  itemId: string;
  quantity: number;
}

// Data structure for Detailed Report
interface DetailedConsumptionItem {
  itemName: string;
  quantitySold: number;
  ingredients: { name: string; unit: string; total: number }[];
}

// Data structure for Aggregated Report item
interface AggregatedConsumptionItem {
  name: string;
  unit: string;
  total: number;
}

// Print State Configuration
interface PrintState {
  ref: string;
  date: string;
  type: 'invoice' | 'consumption-aggregated' | 'consumption-detailed';
  invoiceItems?: SaleEntry[]; 
  aggregatedReport?: AggregatedConsumptionItem[]; 
  detailedReport?: DetailedConsumptionItem[];
}

// Modal State
interface ConsumptionModalState {
  isOpen: boolean;
  refNumber: string;
  date: string;
  batchItems: SaleEntry[];
}

const SalesEntryPage: React.FC<Props> = ({ items, sales, materials, recipes, onSave, onDeleteSale, onUpdateSale }) => {
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

  // Printing & Modal State
  const [printData, setPrintData] = useState<PrintState | null>(null);
  const [consumptionModal, setConsumptionModal] = useState<ConsumptionModalState | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // --- Recursive Consumption Logic ---
  const getFlattenedConsumption = useCallback((itemId: string, multiplier: number, memo: Record<string, number> = {}, visited: Set<string> = new Set()): Record<string, number> => {
    const recipe = recipes.find(r => r.itemId === itemId);
    if (!recipe || visited.has(itemId)) return memo;

    visited.add(itemId);
    recipe.ingredients.forEach(ing => {
      const qty = (ing.quantity || 0) * multiplier;
      if (ing.materialId) {
        memo[ing.materialId] = (memo[ing.materialId] || 0) + qty;
      } else if (ing.subItemId) {
        getFlattenedConsumption(ing.subItemId, qty, memo, visited);
      }
    });
    visited.delete(itemId);
    return memo;
  }, [recipes]);

  // --- Printing Data Preparation ---

  // 1. Prepare Aggregated Data
  const prepareAggregatedReport = (batchItems: SaleEntry[]): AggregatedConsumptionItem[] => {
    const consumptionMap: Record<string, number> = {};
    batchItems.forEach(sale => {
      getFlattenedConsumption(sale.itemId, sale.quantitySold, consumptionMap);
    });
    return materials.map(m => ({
      name: m.name,
      unit: m.unit,
      total: consumptionMap[m.id] || 0
    })).filter(r => r.total > 0);
  };

  // 2. Prepare Detailed Data
  const prepareDetailedReport = (batchItems: SaleEntry[]): DetailedConsumptionItem[] => {
    const result: DetailedConsumptionItem[] = [];
    
    // Group sales by Item ID to show "Burger: 5" instead of listing Burger 5 times
    const consolidatedItems: Record<string, number> = {};
    batchItems.forEach(item => {
      consolidatedItems[item.itemId] = (consolidatedItems[item.itemId] || 0) + item.quantitySold;
    });

    Object.entries(consolidatedItems).forEach(([itemId, totalQty]) => {
      const saleItem = items.find(i => i.id === itemId);
      if (!saleItem) return;

      const consumptionMap: Record<string, number> = {};
      getFlattenedConsumption(itemId, totalQty, consumptionMap);

      const ingredients = materials.map(m => ({
        name: m.name,
        unit: m.unit,
        total: consumptionMap[m.id] || 0
      })).filter(r => r.total > 0);

      if (ingredients.length > 0) {
        result.push({
          itemName: saleItem.name,
          quantitySold: totalQty,
          ingredients
        });
      }
    });
    return result;
  };

  // --- Print Handlers ---

  const handleOpenConsumptionModal = (refNumber: string, date: string, batchItems: SaleEntry[]) => {
    setConsumptionModal({ isOpen: true, refNumber, date, batchItems });
  };

  const handlePrint = (type: PrintState['type']) => {
    if (!consumptionModal && type !== 'invoice') return;
    
    // Invoice Printing is handled directly via handlePrintBatchInvoice, but checking here for safety
    if (type === 'invoice') return;

    const { refNumber, date, batchItems } = consumptionModal!;

    if (type === 'consumption-aggregated') {
      const data = prepareAggregatedReport(batchItems);
      if (data.length === 0) return alert("لا يوجد استهلاك مسجل (تأكد من الوصفات).");
      setPrintData({ ref: refNumber, date, type, aggregatedReport: data });
    } else if (type === 'consumption-detailed') {
      const data = prepareDetailedReport(batchItems);
      if (data.length === 0) return alert("لا يوجد استهلاك مسجل (تأكد من الوصفات).");
      setPrintData({ ref: refNumber, date, type, detailedReport: data });
    }

    setConsumptionModal(null); // Close modal
    setTimeout(() => window.print(), 100);
  };

  const handlePrintBatchInvoice = (refNumber: string, date: string, batchItems: SaleEntry[]) => {
    setPrintData({ ref: refNumber, date, type: 'invoice', invoiceItems: batchItems });
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // --- Export Logic ---
  const handleExportBatchReport = (refNumber: string, date: string, batchItems: SaleEntry[]) => {
    const data = prepareAggregatedReport(batchItems);
    if (data.length === 0) {
      alert("لا يوجد استهلاك خامات مسجل لهذه الفاتورة.");
      return;
    }

    const BOM = "\uFEFF";
    let csvContent = `تقرير استهلاك فاتورة رقم: ${refNumber}\nالتاريخ: ${date}\n\n`;
    csvContent += "الخامة,الوحدة,إجمالي الكمية المستهلكة\n";
    data.forEach(r => csvContent += `"${r.name}","${r.unit}",${r.total.toFixed(3)}\n`);

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Consumption_Invoice_${refNumber}.csv`;
    link.click();
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
      setActiveTab('history');
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

  // --- History Logic ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const dateMatch = s.date >= filterStartDate && s.date <= filterEndDate;
      const itemMatch = filterItemId ? s.itemId === filterItemId : true;
      return dateMatch && itemMatch;
    });
  }, [sales, filterStartDate, filterEndDate, filterItemId]);

  const groupedSales = useMemo(() => {
    const byDate: Record<string, SaleEntry[]> = {};
    filteredSales.forEach(sale => {
      if (!byDate[sale.date]) byDate[sale.date] = [];
      byDate[sale.date].push(sale);
    });

    const sortedDates = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));

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
      
      {/* --- Selection Modal --- */}
      {consumptionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <Printer className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">طباعة تقرير استهلاك</h3>
              <p className="text-sm text-slate-500">اختر نوع التقرير المطلوب للفاتورة <span className="font-mono font-bold text-slate-700">{consumptionModal.refNumber}</span></p>
            </div>
            
            <div className="p-6 space-y-3">
              <button 
                onClick={() => handlePrint('consumption-aggregated')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/10 transition-all group text-right"
              >
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                  <Layers className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">تقرير تجميعي (ملخص)</h4>
                  <p className="text-xs text-slate-500 mt-1">يعرض إجمالي كميات الخامات المستهلكة في الفاتورة بالكامل (للمخزن).</p>
                </div>
              </button>

              <button 
                onClick={() => handlePrint('consumption-detailed')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/10 transition-all group text-right"
              >
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                  <List className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">تقرير تفصيلي (تحليلي)</h4>
                  <p className="text-xs text-slate-500 mt-1">يعرض كل صنف مباع على حدة مع تفصيل الخامات المستهلكة له.</p>
                </div>
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
               <button onClick={() => setConsumptionModal(null)} className="w-full py-3 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">إلغاء الأمر</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Hidden Print Templates --- */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 overflow-y-auto" ref={printRef}>
        {printData && (
          <div className="max-w-3xl mx-auto">
             {/* Print Header */}
             <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-8">
               <div className="flex items-center gap-4">
                  <div className="border-2 border-black p-3 rounded-lg"><ChefHat className="w-10 h-10" /></div>
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight">CulinaTrack</h1>
                    <p className="text-sm font-bold text-gray-600 mt-1">نظام إدارة استهلاك المطاعم</p>
                  </div>
               </div>
               <div className="text-left">
                  <h2 className="text-2xl font-bold uppercase tracking-wide bg-black text-white px-4 py-1 inline-block mb-2">
                    {printData.type === 'invoice' && 'فاتورة مبيعات'}
                    {printData.type === 'consumption-aggregated' && 'تقرير استهلاك (تجميعي)'}
                    {printData.type === 'consumption-detailed' && 'تقرير استهلاك (تفصيلي)'}
                  </h2>
                  <div className="flex flex-col text-sm font-bold space-y-1">
                    <span>رقم المرجع: <span className="font-mono text-lg">{printData.ref}</span></span>
                    <span>تاريخ الفاتورة: {printData.date}</span>
                  </div>
               </div>
             </div>
             
             {/* 1. Invoice Template */}
             {printData.type === 'invoice' && printData.invoiceItems && (
               <table className="w-full text-right text-sm border-collapse border border-black">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 border-b border-black border-l">الصنف</th>
                      <th className="py-3 px-4 text-center border-b border-black border-l">الكمية</th>
                      <th className="py-3 px-4 text-left border-b border-black">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.invoiceItems.map((item, idx) => {
                      const i = items.find(x => x.id === item.itemId);
                      return (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-3 px-4 font-bold border-l border-gray-300">{i?.name}</td>
                          <td className="py-3 px-4 text-center font-mono text-lg border-l border-gray-300">{item.quantitySold}</td>
                          <td className="py-3 px-4 text-left">{i?.unit}</td>
                        </tr>
                      )
                    })}
                  </tbody>
               </table>
             )}

             {/* 2. Aggregated Consumption Template */}
             {printData.type === 'consumption-aggregated' && printData.aggregatedReport && (
               <table className="w-full text-right text-sm border-collapse border border-black">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 border-b border-black border-l w-1/2">الخامة الأساسية</th>
                      <th className="py-3 px-4 text-center border-b border-black border-l">إجمالي الكمية المستهلكة</th>
                      <th className="py-3 px-4 text-left border-b border-black">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.aggregatedReport.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-3 px-4 font-bold border-l border-gray-300">{item.name}</td>
                        <td className="py-3 px-4 text-center font-mono text-lg font-bold border-l border-gray-300">{item.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                        <td className="py-3 px-4 text-left">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             )}

             {/* 3. Detailed Consumption Template */}
             {printData.type === 'consumption-detailed' && printData.detailedReport && (
               <div className="space-y-6">
                 {printData.detailedReport.map((item, idx) => (
                   <div key={idx} className="border border-black break-inside-avoid shadow-sm">
                      <div className="bg-gray-100 px-4 py-3 border-b border-black flex justify-between items-center">
                        <span className="font-bold text-lg">{item.itemName}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-gray-500">العدد المباع:</span>
                           <span className="font-mono font-bold bg-black text-white px-3 py-1 rounded-md">{item.quantitySold}</span>
                        </div>
                      </div>
                      <table className="w-full text-right text-sm">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 w-2/3">الخامة المستهلكة</th>
                            <th className="px-4 py-2 text-center">الكمية</th>
                            <th className="px-4 py-2 text-left">الوحدة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {item.ingredients.map((ing, iIdx) => (
                            <tr key={iIdx}>
                              <td className="px-4 py-2 font-medium">{ing.name}</td>
                              <td className="px-4 py-2 text-center font-mono">{ing.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                              <td className="px-4 py-2 text-left text-xs">{ing.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                 ))}
               </div>
             )}

             <div className="mt-12 pt-6 border-t-2 border-black flex justify-between items-end">
                <div className="text-xs font-bold text-gray-500">
                   <p>تم طباعة التقرير بواسطة نظام CulinaTrack</p>
                   <p>توقيت الطباعة: {new Date().toLocaleString('ar-EG')}</p>
                </div>
                <div className="text-center w-40">
                   <div className="h-0.5 bg-black w-full mb-2"></div>
                   <p className="text-xs font-bold">توقيع المسؤول</p>
                </div>
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
                                   onClick={(e) => { e.stopPropagation(); handleExportBatchReport(ref, dayGroup.date, batchItems); }}
                                   className="p-2.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-transparent hover:border-blue-200"
                                   title="تصدير تقرير استهلاك (Excel)"
                                 >
                                    <FileSpreadsheet className="w-5 h-5" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleOpenConsumptionModal(ref, dayGroup.date, batchItems); }}
                                   className="p-2.5 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 rounded-xl transition-colors border border-transparent hover:border-emerald-200"
                                   title="طباعة تقرير استهلاك"
                                 >
                                    <Printer className="w-5 h-5" />
                                 </button>
                                 <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handlePrintBatchInvoice(ref, dayGroup.date, batchItems); }}
                                   className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                                   title="طباعة الفاتورة"
                                 >
                                    <FileText className="w-5 h-5" />
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
