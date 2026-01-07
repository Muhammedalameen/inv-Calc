
import React from 'react';
import { Package, ChefHat, ShoppingCart, FileText, UtensilsCrossed, X, Search, LogOut, ArrowLeftRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  restaurantName: string;
  onExit: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen, restaurantName, onExit }) => {
  const menuItems = [
    { id: 'items', label: 'أصناف المبيعات', icon: UtensilsCrossed },
    { id: 'materials', label: 'الخامات الأساسية', icon: Package },
    { id: 'recipes', label: 'إدارة الوصفات', icon: ChefHat },
    { id: 'sales', label: 'إدخال المبيعات', icon: ShoppingCart },
    { id: 'query', label: 'استعلام سريع', icon: Search },
    { id: 'reports', label: 'تقارير الاستهلاك', icon: FileText },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">CulinaTrack</h1>
            </div>
            <button 
              className="lg:hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">المطعم النشط</p>
            <p className="text-sm font-bold text-emerald-400 truncate">{restaurantName}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onExit}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-medium"
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span>تبديل المطعم</span>
          </button>
          <div className="mt-4 text-center text-[10px] text-slate-600">
            CulinaTrack v1.2.0
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
