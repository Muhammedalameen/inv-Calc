
import React, { useState, useMemo } from 'react';
import { Layers, List, FileSpreadsheet, Printer, ChefHat, Calendar, Filter, RotateCcw } from 'lucide-react';
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

  // Filtered sales based on selected date range
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = sale.date;
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, startDate, endDate]);

  const aggregatedData = useMemo(() => {
    const reportMap: Record<string, { name: string; unit: string; total: number }> = {};
    materials.forEach(m => {
      reportMap[m.id] = { name: m.name, unit: m.unit, total: 0 };
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
    return Object.values(reportMap).filter(item => item.total > 0);
  }, [materials, recipes, filteredSales]);

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
        results.push({
          itemName: item.name,
          quantitySold: qtySold,
          ingredients: recipe.ingredients.map(ing => {
            const mat = materials.find(m => m.id === ing.materialId);
            return {
              materialName: mat?.name || 'مجهول',
              unit: mat?.unit || '',
              consumedQuantity: ing.quantity * qtySold
            };
          })
        });
      }
    });
    return results;
  }, [items, recipes, filteredSales, materials]);

  const resetFilter = () => {
    setStartDate(firstDayOfMonth);
    setEndDate(today);
  };

  const exportCSV = () => {
    let csvContent = "";
    if (reportType === 'aggregated') {
      csvContent = "الخامة,وحدة القياس,إجمالي الاستهلاك\n";
      aggregatedData.forEach(row => {
        csvContent += `"${row.name}","${row.unit}",${row.total.toFixed(3)}\n`;
      });
    } else {
      csvContent = "الصنف,المباع,الخامة,الكمية المستهلكة,الوحدة\n";
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
    link.setAttribute("download", `تقرير_استهلاك_${reportType === 'aggregated' ? 'تجميعي' : 'تفصيلي'}_${startDate}_إلى_${endDate}.csv`);
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
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 no-print transition-colors">
        <div className="flex items-center gap-2 mb-4 text-slate-700 dark:text-slate-200 font-bold">
          <Filter className="w-5 h-5 text-emerald-500" />
          <h3>تصفية التقرير حسب التاريخ</h3>
        </div>
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 mr-1">من تاريخ</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 mr-1">إلى تاريخ</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 dark:text-white" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>
          <button 
            onClick={resetFilter}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors font-bold whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" /> إعادة تعيين
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit transition-colors">
          <button
            onClick={() => setReportType('aggregated')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              reportType === 'aggregated' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" /> تقرير تجميعي
          </button>
          <button
            onClick={() => setReportType('detailed')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              reportType === 'detailed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <List className="w-4 h-4" /> تقرير تفصيلي
          </button>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" /> تصدير CSV
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-bold"
          >
            <Printer className="w-4 h-4" /> تصدير PDF / طباعة
          </button>
        </div>
      </div>

      {reportType === 'aggregated' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:bg-white flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">إجمالي استهلاك الخامات</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">مجمع بناءً على الوصفات والمبيعات للفترة المحددة</p>
            </div>
            <div className="text-left text-xs font-mono text-slate-400">
              {startDate} ⮕ {endDate}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50/50 dark:bg-slate-800/20">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">الخامة</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">وحدة القياس</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 text-left">إجمالي الاستهلاك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {aggregatedData.length > 0 ? aggregatedData.map((data, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{data.name}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{data.unit}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-left">
                      {data.total.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 italic">لا توجد بيانات مبيعات في هذه الفترة لحساب الاستهلاك</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {detailedData.length > 0 ? detailedData.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:break-inside-avoid transition-colors">
              <div className="p-4 bg-slate-900 dark:bg-slate-800 text-white flex justify-between items-center print:bg-slate-100 print:text-slate-900 print:border-b">
                <span className="text-lg font-bold">{item.itemName}</span>
                <span className="bg-emerald-500 px-3 py-1 rounded-lg text-sm font-bold print:bg-slate-200">المباع: {item.quantitySold} وحدة</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase">الخامة</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase text-left">كمية الاستهلاك</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {item.ingredients.map((ing, iIdx) => (
                      <tr key={iIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{ing.materialName}</td>
                        <td className="px-6 py-3 text-sm font-mono font-bold text-slate-800 dark:text-slate-200 text-left">
                          {ing.consumedQuantity.toLocaleString(undefined, { minimumFractionDigits: 3 })} {ing.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )) : (
            <div className="bg-white dark:bg-slate-900 p-12 text-center text-slate-400 dark:text-slate-600 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
              لا توجد مبيعات تفصيلية لعرضها في الفترة المختارة.
            </div>
          )}
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 text-center text-[10px] text-slate-400 border-t pt-4">
        هذا التقرير تم إنشاؤه آلياً بواسطة نظام CulinaTrack - الفترة المشمولة: {startDate} إلى {endDate}
      </div>
    </div>
  );
};

export default ReportsPage;
