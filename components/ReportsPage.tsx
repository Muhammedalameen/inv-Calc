
import React, { useState, useMemo, useCallback } from 'react';
import { Layers, List, FileSpreadsheet, Printer, ChefHat, Calendar, Filter, RotateCcw, Search, Package, Utensils, Info, HelpCircle } from 'lucide-react';
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

  // Helper to show the nesting path for a material in a given item (for tooltip)
  const getItemRecipePath = (itemId: string) => {
    const recipe = recipes.find(r => r.itemId === itemId);
    if (!recipe) return [];
    return recipe.ingredients.map(ing => {
      if (ing.materialId) {
        const mat = materials.find(m => m.id === ing.materialId);
        return { name: mat?.name, unit: mat?.unit, qty: ing.quantity, isSub: false };
      } else {
        const sub = items.find(i => i.id === ing.subItemId);
        return { name: sub?.name, unit: 'وحدة', qty: ing.quantity, isSub: true };
      }
    });
  };

  // Filtered sales based on selected date range and selected item
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = sale.date;
      const dateMatch = saleDate >= startDate && saleDate <= endDate;
      const itemMatch = selectedItemId ? sale.itemId === selectedItemId : true;
      return dateMatch && itemMatch;
    });
  }, [sales, startDate, endDate, selectedItemId]);

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
      const hasValue = item.total > 0;
      return matchesMaterial && (selectedMaterialId ? true : hasValue);
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
          results.push({
            itemName: item.name,
            quantitySold: qtySold,
            ingredients
          });
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
  };

  const exportCSV = () => {
    const now = new Date().toLocaleString('ar-EG');
    const reportTitle = reportType === 'aggregated' ? "تقرير استهلاك الخامات (تجميعي)" : "تقرير استهلاك الخامات (تفصيلي)";
    
    let csvContent = `نظام CulinaTrack لإدارة استهلاك المطاعم\n`;
    csvContent += `نوع التقرير,${reportTitle}\n`;
    csvContent += `من تاريخ,${startDate}\n`;
    csvContent += `إلى تاريخ,${endDate}\n`;
    if (selectedItemId) csvContent += `الصنف المفلتر,${items.find(i => i.id === selectedItemId)?.name}\n`;
    if (selectedMaterialId) csvContent += `الخامة المفلترة,${materials.find(m => m.id === selectedMaterialId)?.name}\n`;
    csvContent += `تاريخ الاستخراج,${now}\n`;
    csvContent += `\n`;

    if (reportType === 'aggregated') {
      csvContent += "الخامة,وحدة القياس,إجمالي الاستهلاك الفعلي\n";
      aggregatedData.forEach(row => {
        csvContent += `"${row.name}","${row.unit}",${row.total.toFixed(3)}\n`;
      });
    } else {
      csvContent += "الصنف,الكمية المباعة,الخامة المستهلكة,الكمية المستهلكة,الوحدة\n";
      detailedData.forEach(item => {
        item.ingredients.forEach(ing => {
          csvContent += `"${item.itemName}",${item.quantitySold},"${ing.materialName}",${ing.consumedQuantity.toFixed(3)},"${ing.unit}"\n`;
        });
      });
    }

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `CulinaTrack_Report_${reportType}.csv`);
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Branding Header for Print */}
      <div className="hidden print:flex items-center justify-between mb-8 border-b-2 border-emerald-500 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg"><ChefHat className="w-8 h-8 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">CulinaTrack</h1>
            <p className="text-xs text-slate-500">نظام إدارة استهلاك المطاعم</p>
          </div>
        </div>
        <div className="text-left text-right">
          <h2 className="text-xl font-bold text-slate-700">تقرير استهلاك الخامات النهائي</h2>
          <p className="text-sm text-slate-500">الفترة: {startDate} إلى {endDate}</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 no-print transition-colors">
        <div className="flex items-center gap-2 mb-6 text-slate-700 font-bold border-b border-slate-100 pb-4">
          <Filter className="w-5 h-5 text-emerald-500" />
          <h3>تصفية التقارير الذكية</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1"><Calendar className="w-3.5 h-3.5" /> من تاريخ</label>
            <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1"><Calendar className="w-3.5 h-3.5" /> إلى تاريخ</label>
            <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1"><Package className="w-3.5 h-3.5" /> تصفية بالخامة</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)}>
              <option value="">كل الخامات</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1"><Utensils className="w-3.5 h-3.5" /> تصفية بالصنف</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
              <option value="">كل الأصناف</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={resetFilter} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-500 transition-all font-bold text-sm">
            <RotateCcw className="w-4 h-4" /> إعادة تعيين كافة الفلاتر
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit transition-colors">
          <button onClick={() => setReportType('aggregated')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${reportType === 'aggregated' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500'}`}><Layers className="w-4 h-4" /> تقرير تجميعي</button>
          <button onClick={() => setReportType('detailed')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${reportType === 'detailed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500'}`}><List className="w-4 h-4" /> تقرير تفصيلي</button>
        </div>
        
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm text-emerald-700 border border-emerald-100 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors font-bold"><FileSpreadsheet className="w-4 h-4" /> تصدير CSV</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm text-slate-700 border border-slate-200 bg-white px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors font-bold"><Printer className="w-4 h-4" /> طباعة PDF</button>
        </div>
      </div>

      {reportType === 'aggregated' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none transition-colors">
          <div className="p-6 border-b border-slate-100 bg-slate-50 print:bg-white">
            <h3 className="font-bold text-slate-800">إجمالي استهلاك الخامات (بما في ذلك الوصفات المتداخلة)</h3>
            <p className="text-xs text-slate-500">مجمع وشامل لكافة المكونات المجهزة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">الخامة النهائية</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">وحدة القياس</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-left">إجمالي الاستهلاك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aggregatedData.length > 0 ? aggregatedData.map((data, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{data.name}</td>
                    <td className="px-6 py-4 text-slate-500">{data.unit}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 text-left">{data.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">لا توجد مبيعات تتضمن هذه الخامات في الفترة المحددة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {detailedData.map((item, idx) => {
            const recipeId = items.find(i => i.name === item.itemName)?.id;
            return (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:break-inside-avoid">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:bg-slate-100 print:text-slate-900 print:border-b">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{item.itemName}</span>
                    {recipeId && (
                       <div className="relative group cursor-help no-print">
                         <HelpCircle className="w-4 h-4 text-slate-400 hover:text-emerald-400 transition-colors" />
                         <div className="absolute z-50 top-full right-0 mt-2 hidden group-hover:block w-56 bg-white text-slate-800 p-3 rounded-xl shadow-2xl text-[10px] leading-relaxed border border-slate-200 animate-in fade-in slide-in-from-top-1">
                           <p className="font-bold border-b border-slate-100 pb-1 mb-2 text-emerald-600">وصفة الصنف الأصلية:</p>
                           <ul className="space-y-1">
                              {getItemRecipePath(recipeId).map((ing, rIdx) => (
                                <li key={rIdx} className="flex justify-between items-center border-b border-slate-50 pb-0.5 last:border-0">
                                  <span>{ing.isSub ? '⚙️' : '📦'} {ing.name}</span>
                                  <span className="font-mono">{ing.qty} {ing.unit}</span>
                                </li>
                              ))}
                           </ul>
                         </div>
                       </div>
                    )}
                  </div>
                  <span className="bg-emerald-500 px-3 py-1 rounded-lg text-sm font-bold">المباع: {item.quantitySold}</span>
                </div>
                <table className="w-full text-right">
                  <tbody className="divide-y divide-slate-50">
                    {item.ingredients.map((ing, iIdx) => (
                      <tr key={iIdx}>
                        <td className="px-6 py-3 text-sm text-slate-600">{ing.materialName}</td>
                        <td className="px-6 py-3 text-sm font-mono font-bold text-slate-800 text-left">{ing.consumedQuantity.toLocaleString(undefined, { minimumFractionDigits: 3 })} {ing.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {detailedData.length === 0 && <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border">لا توجد بيانات للعرض بناءً على التصفية</div>}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
