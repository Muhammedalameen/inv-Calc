
import React from 'react';
import { Menu, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onOpenSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onOpenSidebar, isDarkMode, toggleDarkMode }) => {
  const titles: Record<string, string> = {
    materials: 'إدارة الخامات',
    units: 'إدارة وحدات القياس',
    items: 'أصناف المبيعات',
    recipes: 'هندسة الوصفات',
    sales: 'المبيعات اليومية',
    reports: 'تقارير الاستهلاك الفعلي',
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -mr-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
          {titles[activeTab]}
        </h2>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          title={isDarkMode ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="hidden sm:block text-xs md:text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full whitespace-nowrap">
          المستخدم: مدير النظام
        </div>
      </div>
    </header>
  );
};

export default Header;
