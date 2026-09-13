import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Tags, Settings, LogOut, Home, Calculator, ExternalLink } from 'lucide-react';
import { cn } from '../../components/ProductCard';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Smartphone, label: 'จัดการสินค้า', path: '/admin/products' },
  { icon: Tags, label: 'จัดการแบรนด์', path: '/admin/brands' },
  { icon: Settings, label: 'ตั้งค่าระบบ', path: '/admin/settings' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 selection:bg-red-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200/80 flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-zinc-100 gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-red-200 shadow-2xs p-0.5 shrink-0 flex items-center justify-center">
            <img 
              src="/branch_logo.jpg" 
              alt="Jaymart Robinson Surin" 
              className="w-full h-full object-contain rounded-full" 
            />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-zinc-900 block truncate">Jaymart Robinson Surin</span>
            <p className="text-[10px] text-red-600 font-semibold">ระบบจัดการสต็อค</p>
          </div>
        </div>
        <nav className="flex-1 py-5 px-3.5 space-y-1">
          <Link
            to="/"
            className="flex items-center px-3.5 py-2.5 text-xs font-bold rounded-full text-zinc-800 bg-zinc-100 hover:bg-zinc-200/80 mb-4 transition-all active:scale-98 group"
          >
            <Home className="w-4 h-4 mr-2.5 text-zinc-600 flex-shrink-0" />
            กลับหน้าร้าน (Storefront)
          </Link>
          
          <div className="pt-2 pb-1.5">
            <div className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">เมนูการจัดการ</div>
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-3.5 py-2.5 text-xs font-semibold rounded-full transition-all group active:scale-98",
                  isActive 
                    ? "bg-zinc-900 text-white shadow-xs font-bold" 
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                )}
              >
                <item.icon className={cn("w-4 h-4 mr-3 flex-shrink-0 transition-colors", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700")} />
                {item.label}
              </Link>
            )
          })}

          <div className="pt-3 pb-1">
            <div className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">ลิงก์ภายนอก</div>
          </div>

          <a
            href="https://installment-calculator.pchindasook.workers.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-full text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 transition-all group active:scale-98"
          >
            <div className="flex items-center min-w-0">
              <Calculator className="w-4 h-4 mr-2.5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Samsung Finance+</span>
            </div>
            <ExternalLink className="w-3 h-3 text-blue-500 opacity-70 ml-1.5 flex-shrink-0" />
          </a>
        </nav>
        <div className="p-3.5 border-t border-zinc-100">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3.5 py-2.5 text-xs font-semibold text-zinc-600 hover:text-red-600 rounded-full hover:bg-red-50/80 transition-all group cursor-pointer active:scale-98"
          >
            <LogOut className="w-4 h-4 mr-3 text-zinc-400 group-hover:text-red-500 flex-shrink-0 transition-colors" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
