import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Storefront from './pages/Storefront';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ProductList from './pages/admin/ProductList';
import ProductForm from './pages/admin/ProductForm';
import BrandManager from './pages/admin/BrandManager';
import Settings from './pages/admin/Settings';
import AdminSdc from './pages/admin/AdminSdc';
import Login from './pages/Login';

function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 bg-zinc-50 z-50 flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-red-500/10 blur-3xl pointer-events-none -top-10 -right-10 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none -bottom-10 -left-10 animate-pulse" style={{ animationDuration: '6s' }} />

      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center max-w-sm w-full text-center space-y-6"
      >
        {/* Sleek Minimalist Brand Logo / Icon */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-3xl bg-white border border-zinc-200 flex items-center justify-center p-3 shadow-xl shadow-red-500/10">
            <img 
              src="/logo.png" 
              alt="Jaymart Logo" 
              className="w-full h-full object-contain" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }} 
            />
            <div className="hidden font-black text-2xl text-red-600 tracking-tighter">
              JM
            </div>
          </div>
          {/* Subtle pulse ring */}
          <span className="absolute -inset-1 rounded-3xl bg-red-500/10 blur-sm -z-10 animate-ping" style={{ animationDuration: '2.5s' }} />
        </div>

        {/* Storefront Typography */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-zinc-200 text-[11px] font-medium text-zinc-600 tracking-wide shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE INVENTORY • สุรินทร์</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight pt-1">
            JAYMART <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">SURIN</span>
          </h1>
          <p className="text-xs text-zinc-500 font-normal">
            โรบินสันสุรินทร์
          </p>
        </div>

        {/* Minimalist Gen Z Progress Track */}
        <div className="w-44 space-y-2 pt-2">
          <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full"
            />
          </div>
          <p className="text-[10px] text-zinc-400 font-mono tracking-wider">
            SYNCHRONIZING...
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('jaymart_app_loaded');
  });

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('jaymart_app_loaded', 'true');
    }, 1400);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/edit/:id" element={<ProductForm />} />
            <Route path="brands" element={<BrandManager />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sdc" element={<AdminSdc />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
