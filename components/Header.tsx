
import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onOpenSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onOpenSidebar }) => {
  const titles: Record<string, string> = {
    materials: 'إدارة الخامات',
    units: 'إدارة وحدات القياس',
    items: 'أصناف المبيعات',
    recipes: 'هندسة الوصفات',
    sales: 'المبيعات اليومية',
    reports: 'تقارير الاستهلاك الفعلي',
    query: 'استعلام سريع عن الاستهلاك',
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">
          {titles[activeTab]}
        </h2>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-xs md:text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full whitespace-nowrap">
          المستخدم: مدير النظام
        </div>
      </div>
    </header>
  );
};

export default Header;
