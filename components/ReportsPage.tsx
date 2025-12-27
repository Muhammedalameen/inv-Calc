
import React, { useState, useMemo } from 'react';
import { Layers, List, FileSpreadsheet, Printer, ChefHat, Calendar, Filter, RotateCcw, Search, Package, Utensils } from 'lucide-react';
import { Material, SalesItem, Recipe, SaleEntry, AggregatedReportItem, DetailedReportItem } from '../types';

interface Props {
  materials: Material[];
  items: SalesItem[];
  recipes: Recipe[];
  sales: SaleEntry[];
}

const ReportsPage: React.FC<Props> = ({ materials, items, recipes, sales }) => {
  const [reportType, setReportType] = useState<'aggregated' | 'detailed'>('aggregated');
  
  // Date filter states
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(today);
  
  // New Filter States
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

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
    const reportMap: Record<string, { name: string; unit: string; total: number }> = {};
    
    // Initialize or filter materials
    materials.forEach(m => {
      if (!selectedMaterialId || m.id === selectedMaterialId) {
        reportMap[m.id] = { name: m.name, unit: m.unit, total: 0 };
      }
    });
    
    filteredSales.forEach(sale => {
      const recipe = recipes.find(r => r.itemId === sale.itemId);
      if (recipe) {
        recipe.ingredients.forEach(ing => {
          if (reportMap[ing.materialId]) {
            reportMap[ing.materialId].total += ing.quantity * sale.quantitySold;
          }
        });
      }
    });

    // If a material filter is active but no sales exist for it, we might still want to see 0 or just filter it out.
    // Here we filter out items with 0 total unless a specific material is selected.
    return Object.values(reportMap).filter(item => selectedMaterialId ? true : item.total > 0);
  }, [materials, recipes, filteredSales, selectedMaterialId]);

  const detailedData = useMemo(() => {
    const results: DetailedReportItem[] = [];
    const itemSalesMap: Record<string, number> = {};
    
    filteredSales.forEach(s => {
      itemSalesMap[s.itemId] = (itemSalesMap[s.itemId] || 0) + s.quantitySold;
    });
    
    Object.entries(itemSalesMap).forEach(([itemId, qtySold]) => {
      const item = items.find(i => i.id === itemId);
      const recipe = recipes.find(r => r.itemId === itemId);
      
      if (item && recipe) {
        // Filter ingredients based on selected material
        const filteredIngredients = recipe.ingredients
          .filter(ing => !selectedMaterialId || ing.materialId === selectedMaterialId)
          .map(ing => {
            const mat = materials.find(m => m.id === ing.materialId);
            return {
              materialName: mat?.name || 'مجهول',
              unit: mat?.unit || '',
              consumedQuantity: ing.quantity * qtySold
            };
          });

        if (filteredIngredients.length > 0) {
          results.push({
            itemName: item.name,
            quantitySold: qtySold,
            ingredients: filteredIngredients
          });
        }
      }
    });
    return results;
  }, [items, recipes, filteredSales, materials, selectedMaterialId]);

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
    link.setAttribute("download", `CulinaTrack_${reportType === 'aggregated' ? 'Aggregated' : 'Detailed'}_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Print Branding Header */}
      <div className="hidden print:flex items-center justify-between mb-8 border-b-2 border-emerald-500 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">CulinaTrack</h1>
            <p className="text-xs text-slate-500">نظام إدارة استهلاك المطاعم</p>
          </div>
        </div>
        <div className="text-left text-right">
          <h2 className="text-xl font-bold text-slate-700">تقرير استهلاك الخامات</h2>
          <p className="text-sm text-slate-500">الفترة من: {startDate} إلى: {endDate}</p>
          {(selectedItemId || selectedMaterialId) && (
            <p className="text-xs text-slate-400">
              تصفية: {selectedItemId && `صنف: ${items.find(i => i.id === selectedItemId)?.name}`} 
              {selectedItemId && selectedMaterialId && ' | '}
              {selectedMaterialId && `خامة: ${materials.find(m => m.id === selectedMaterialId)?.name}`}
            </p>
          )}
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
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Calendar className="w-3.5 h-3.5" /> من تاريخ
            </label>
            <input 
              type="date" 
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Calendar className="w-3.5 h-3.5" /> إلى تاريخ
            </label>
            <input 
              type="date" 
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Package className="w-3.5 h-3.5" /> تصفية بالخامة
            </label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
            >
              <option value="">كل الخامات</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Utensils className="w-3.5 h-3.5" /> تصفية بالصنف
            </label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              <option value="">كل الأصناف</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={resetFilter}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm"
          >
            <RotateCcw className="w-4 h-4" /> إعادة تعيين كافة الفلاتر
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit transition-colors">
          <button
            onClick={() => setReportType('aggregated')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              reportType === 'aggregated' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" /> تقرير تجميعي
          </button>
          <button
            onClick={() => setReportType('detailed')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              reportType === 'detailed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500'
            }`}
          >
            <List className="w-4 h-4" /> تقرير تفصيلي
          </button>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 text-sm text-emerald-700 border border-emerald-100 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" /> تصدير CSV
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 text-sm text-slate-700 border border-slate-200 bg-white px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors font-bold"
          >
            <Printer className="w-4 h-4" /> تصدير PDF / طباعة
          </button>
        </div>
      </div>

      {reportType === 'aggregated' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none transition-colors">
          <div className="p-6 border-b border-slate-100 bg-slate-50 print:bg-white flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">إجمالي استهلاك الخامات</h3>
              <p className="text-xs text-slate-500">مجمع بناءً على الوصفات والمبيعات للفترة المحددة</p>
            </div>
            <div className="text-left text-xs font-mono text-slate-400 print:text-slate-600">
              {startDate} ⮕ {endDate}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">الخامة</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">وحدة القياس</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-left">إجمالي الاستهلاك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aggregatedData.length > 0 ? aggregatedData.map((data, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{data.name}</td>
                    <td className="px-6 py-4 text-slate-500">{data.unit}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 text-left">
                      {data.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <span>لا توجد بيانات مطابقة لهذه الفلاتر</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {detailedData.length > 0 ? detailedData.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:break-inside-avoid transition-colors">
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:bg-slate-100 print:text-slate-900 print:border-b">
                <span className="text-lg font-bold">{item.itemName}</span>
                <span className="bg-emerald-500 px-3 py-1 rounded-lg text-sm font-bold print:bg-slate-200">المباع: {item.quantitySold} وحدة</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">الخامة</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase text-left">كمية الاستهلاك</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {item.ingredients.map((ing, iIdx) => (
                      <tr key={iIdx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 text-sm text-slate-600">{ing.materialName}</td>
                        <td className="px-6 py-3 text-sm font-mono font-bold text-slate-800 text-left">
                          {ing.consumedQuantity.toLocaleString(undefined, { minimumFractionDigits: 3 })} {ing.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )) : (
            <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200 transition-colors">
               <div className="flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 opacity-20" />
                  <span>لا توجد مبيعات تفصيلية مطابقة للفلاتر المختارة</span>
                </div>
            </div>
          )}
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 text-center text-[10px] text-slate-400 border-t pt-4">
        هذا التقرير تم إنشاؤه آلياً بواسطة نظام CulinaTrack - الفترة المشمولة: {startDate} إلى {endDate}
        {(selectedItemId || selectedMaterialId) && ` | تصفية نشطة`}
      </div>
    </div>
  );
};

export default ReportsPage;
