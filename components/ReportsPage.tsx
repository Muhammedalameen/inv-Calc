
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Layers, List, FileSpreadsheet, Printer, ChefHat, Calendar, Filter, RotateCcw, Search, Package, Utensils, Info, HelpCircle, ChevronDown, CheckSquare, Square, Hash, X } from 'lucide-react';
import { Material, SalesItem, Recipe, SaleEntry, DetailedReportItem } from '../types';

interface Props {
  materials: Material[];
  items: SalesItem[];
  recipes: Recipe[];
  sales: SaleEntry[];
}

const ReportsPage: React.FC<Props> = ({ materials, items, recipes, sales }) => {
  const [reportType, setReportType] = useState<'aggregated' | 'detailed'>('aggregated');
  
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(today);
  
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // --- Invoice Reference Filtering State ---
  const [selectedRefNumbers, setSelectedRefNumbers] = useState<string[]>([]);
  const [isRefDropdownOpen, setIsRefDropdownOpen] = useState(false);
  const refDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (refDropdownRef.current && !refDropdownRef.current.contains(event.target as Node)) {
        setIsRefDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recursive function to flatten consumption from nested recipes
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

  // Direct ingredients for visual grouping in detailed view
  const getDirectRecipe = (itemId: string) => {
    const recipe = recipes.find(r => r.itemId === itemId);
    if (!recipe) return [];
    return recipe.ingredients.map(ing => ({
      name: ing.materialId ? materials.find(m => m.id === ing.materialId)?.name : items.find(i => i.id === ing.subItemId)?.name,
      isSub: !!ing.subItemId,
      qty: ing.quantity
    }));
  };

  // Get Unique Invoice References from all sales (Sorted Newest First)
  const uniqueReferences = useMemo(() => {
    const refsMap = new Map<string, string>(); // Ref -> Date
    sales.forEach(s => {
      if (s.referenceNumber && !refsMap.has(s.referenceNumber)) {
        refsMap.set(s.referenceNumber, s.date);
      }
    });
    // Convert to array and sort by date descending
    return Array.from(refsMap.entries())
      .map(([ref, date]) => ({ ref, date }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales]);

  const toggleRefSelection = (ref: string) => {
    setSelectedRefNumbers(prev => 
      prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
    );
  };

  // Main Filter Logic
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const itemMatch = selectedItemId ? sale.itemId === selectedItemId : true;

      // Priority Logic: If specific invoices are selected, prioritize them over date range.
      // If no invoices selected, fallback to date range.
      if (selectedRefNumbers.length > 0) {
        const refMatch = sale.referenceNumber && selectedRefNumbers.includes(sale.referenceNumber);
        return refMatch && itemMatch;
      }

      // Default Date Range Logic
      const saleDate = sale.date;
      const dateMatch = saleDate >= startDate && saleDate <= endDate;
      return dateMatch && itemMatch;
    });
  }, [sales, startDate, endDate, selectedItemId, selectedRefNumbers]);

  const aggregatedData = useMemo(() => {
    const consumptionMap: Record<string, number> = {};
    filteredSales.forEach(sale => {
      getFlattenedConsumption(sale.itemId, sale.quantitySold, consumptionMap);
    });

    const results = materials.map(m => ({
      name: m.name,
      unit: m.unit,
      total: consumptionMap[m.id] || 0,
      id: m.id
    }));

    return results.filter(item => {
      const matchesMaterial = selectedMaterialId ? item.id === selectedMaterialId : true;
      return matchesMaterial && (selectedMaterialId ? true : item.total > 0);
    });
  }, [materials, filteredSales, getFlattenedConsumption, selectedMaterialId]);

  const detailedData = useMemo(() => {
    const results: DetailedReportItem[] = [];
    const itemSalesMap: Record<string, number> = {};
    
    filteredSales.forEach(s => {
      itemSalesMap[s.itemId] = (itemSalesMap[s.itemId] || 0) + s.quantitySold;
    });
    
    Object.entries(itemSalesMap).forEach(([itemId, qtySold]) => {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const flatIngs = getFlattenedConsumption(itemId, 1);
        const ingredients = Object.entries(flatIngs)
          .filter(([matId]) => !selectedMaterialId || matId === selectedMaterialId)
          .map(([matId, qtyPerUnit]) => {
            const mat = materials.find(m => m.id === matId);
            return {
              materialName: mat?.name || 'مجهول',
              unit: mat?.unit || '',
              consumedQuantity: Number(qtyPerUnit) * Number(qtySold)
            };
          });

        if (ingredients.length > 0) {
          results.push({ itemName: item.name, quantitySold: qtySold, ingredients });
        }
      }
    });
    return results;
  }, [items, filteredSales, materials, selectedMaterialId, getFlattenedConsumption]);

  const resetFilter = () => {
    setStartDate(firstDayOfMonth);
    setEndDate(today);
    setSelectedMaterialId('');
    setSelectedItemId('');
    setSelectedRefNumbers([]);
  };

  const exportCSV = () => {
    const BOM = "\uFEFF";
    let periodText = selectedRefNumbers.length > 0 
      ? `فواتير محددة (${selectedRefNumbers.length})` 
      : `${startDate} إلى ${endDate}`;

    let csvContent = `نظام CulinaTrack - تقرير استهلاك\nالفترة,${periodText}\n\n`;
    
    if (reportType === 'aggregated') {
      csvContent += "الخامة,الوحدة,الإجمالي\n";
      aggregatedData.forEach(r => csvContent += `"${r.name}","${r.unit}",${r.total.toFixed(3)}\n`);
    } else {
      csvContent += "الصنف,المباع,الخامة,الكمية,الوحدة\n";
      detailedData.forEach(d => d.ingredients.forEach(ing => csvContent += `"${d.itemName}",${d.quantitySold},"${ing.materialName}",${ing.consumedQuantity.toFixed(3)},"${ing.unit}"\n`));
    }
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${reportType}.csv`;
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Branding for Print */}
      <div className="hidden print:flex items-center justify-between mb-8 border-b-2 border-emerald-500 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg"><ChefHat className="w-8 h-8 text-white" /></div>
          <div><h1 className="text-2xl font-bold">CulinaTrack</h1><p className="text-xs">نظام إدارة استهلاك المطاعم</p></div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">تقرير استهلاك الخامات</h2>
          <p className="text-sm">
            {selectedRefNumbers.length > 0 ? `فواتير محددة: ${selectedRefNumbers.length}` : `الفترة: ${startDate} إلى ${endDate}`}
          </p>
        </div>
      </div>

      {/* Filter UI */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 no-print transition-colors">
        <div className="flex items-center gap-2 mb-6 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800 pb-4">
          <Filter className="w-5 h-5 text-emerald-500" /><h3>تصفية التقارير الذكية</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          
          {/* Reference Number Multi-Select */}
          <div className="space-y-1.5 relative" ref={refDropdownRef}>
            <label className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1"><Hash className="w-3 h-3"/> أرقام الفواتير</label>
            <button 
              onClick={() => setIsRefDropdownOpen(!isRefDropdownOpen)}
              className={`w-full flex items-center justify-between border dark:border-slate-700 rounded-xl px-3 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-emerald-500 ${
                selectedRefNumbers.length > 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400' 
                  : 'bg-white dark:bg-slate-800 dark:text-white'
              }`}
            >
              <span className="truncate">
                {selectedRefNumbers.length > 0 ? `${selectedRefNumbers.length} فاتورة محددة` : 'كل الفواتير (حسب التاريخ)'}
              </span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            
            {/* Dropdown List */}
            {isRefDropdownOpen && (
              <div className="absolute top-full right-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-60 overflow-y-auto">
                 {uniqueReferences.length > 0 ? (
                   <div className="p-2 space-y-1">
                      {uniqueReferences.map((item) => {
                        const isSelected = selectedRefNumbers.includes(item.ref);
                        return (
                          <div 
                            key={item.ref} 
                            onClick={() => toggleRefSelection(item.ref)}
                            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className={`mt-1 ${isSelected ? 'text-emerald-500' : 'text-slate-300'}`}>
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold font-mono ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {item.ref}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {item.date}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                   </div>
                 ) : (
                   <div className="p-4 text-center text-xs text-slate-400">لا توجد فواتير مسجلة</div>
                 )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> من تاريخ</label>
            <input 
              type="date" 
              disabled={selectedRefNumbers.length > 0}
              className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2 text-sm disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed" 
              value={startDate} onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> إلى تاريخ</label>
            <input 
              type="date" 
              disabled={selectedRefNumbers.length > 0}
              className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2 text-sm disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed" 
              value={endDate} onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1"><Package className="w-3 h-3"/> الخامة</label>
            <select className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2 text-sm" value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)}>
              <option value="">كل الخامات</option>{materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
           <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1"><Utensils className="w-3 h-3"/> الصنف</label>
            <select className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl px-3 py-2 text-sm" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
              <option value="">كل الأصناف</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
           <div className="lg:col-span-3 flex justify-end items-end h-full">
              <button onClick={resetFilter} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-500 transition-all font-bold text-sm bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-100"><RotateCcw className="w-4 h-4" />إعادة التصفية</button>
           </div>
        </div>
        
        {/* Selected References Tags */}
        {selectedRefNumbers.length > 0 && (
           <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
              <span className="text-xs font-bold text-slate-400 py-1">الفواتير المحددة:</span>
              {selectedRefNumbers.map(ref => (
                <span key={ref} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs px-2 py-1 rounded-md font-mono flex items-center gap-1">
                   {ref}
                   <button onClick={() => toggleRefSelection(ref)} className="hover:text-emerald-600"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={() => setSelectedRefNumbers([])} className="text-[10px] text-rose-500 hover:underline px-2">مسح الكل</button>
           </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-fit transition-colors">
          <button onClick={() => setReportType('aggregated')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${reportType === 'aggregated' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}><Layers className="w-4 h-4" />تقرير تجميعي</button>
          <button onClick={() => setReportType('detailed')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${reportType === 'detailed' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}><List className="w-4 h-4" />تقرير تفصيلي</button>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl font-bold"><FileSpreadsheet className="w-4 h-4" />تصدير CSV</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm text-slate-700 bg-white dark:bg-slate-800 border dark:border-slate-700 px-4 py-2 rounded-xl font-bold"><Printer className="w-4 h-4" />طباعة PDF</button>
        </div>
      </div>

      {reportType === 'aggregated' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <table className="w-full text-right">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500 text-xs font-bold">
              <tr><th className="px-6 py-4">المادة الخام النهائية</th><th className="px-6 py-4">الوحدة</th><th className="px-6 py-4 text-left">إجمالي الاستهلاك الفعلي</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {aggregatedData.map((data, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{data.name}</td>
                  <td className="px-6 py-4 text-slate-500">{data.unit}</td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-left">{data.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                </tr>
              ))}
              {aggregatedData.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">لا توجد بيانات للعرض حسب الفلترة المحددة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {detailedData.map((item, idx) => {
            const itemId = items.find(i => i.name === item.itemName)?.id;
            const directRecipe = itemId ? getDirectRecipe(itemId) : [];
            const hasSubItems = directRecipe.some(r => r.isSub);

            return (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors break-inside-avoid">
                <div className="p-4 bg-slate-900 dark:bg-slate-800 text-white flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{item.itemName}</span>
                    {hasSubItems && (
                       <div className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                         <ChefHat className="w-3 h-3" /> يتضمن مكونات مجهزة
                       </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-sm font-bold">الكمية المباعة: {item.quantitySold}</span>
                    <div className="relative group cursor-help no-print">
                      <HelpCircle className="w-5 h-5 text-slate-400" />
                      <div className="invisible group-hover:visible absolute z-50 top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 text-xs">
                        <p className="font-bold border-b border-slate-100 dark:border-slate-700 pb-2 mb-2 text-emerald-600">المكونات المباشرة للصنف:</p>
                        <ul className="space-y-1.5">
                           {directRecipe.map((r, ri) => (
                             <li key={ri} className="flex justify-between items-center">
                               <span className="flex items-center gap-2">
                                 {r.isSub ? <ChefHat className="w-3 h-3 text-blue-500" /> : <Package className="w-3 h-3 text-slate-400" />}
                                 {r.name}
                               </span>
                               <span className="font-mono text-slate-500">{r.qty}</span>
                             </li>
                           ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> تحليل الاستهلاك الكلي (خامات خام)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {item.ingredients.map((ing, iIdx) => (
                      <div key={iIdx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{ing.materialName}</span>
                        </div>
                        <div className="text-left">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{ing.consumedQuantity.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                          <span className="text-[10px] text-slate-400 font-bold mr-1">{ing.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {detailedData.length === 0 && (
             <div className="px-6 py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">لا توجد بيانات للعرض حسب الفلترة المحددة</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
