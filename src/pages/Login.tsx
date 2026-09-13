import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (localStorage.getItem('token')) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(password);
      localStorage.setItem('token', res.token);
      navigate('/admin');
    } catch (err) {
      setError('รหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-red-500 selection:text-white">
      <Link 
        to="/" 
        className="absolute top-6 left-6 inline-flex items-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-all bg-white hover:bg-zinc-100/80 px-4 py-2 rounded-full shadow-2xs border border-zinc-200/80 active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-2" />
        กลับหน้าร้าน
      </Link>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white p-1 mb-3 shadow-lg shadow-red-500/10 border-2 border-red-500/30 overflow-hidden">
          <img 
            src="/branch_logo.jpg" 
            alt="เจมาร์ท สาขาโรบินสันสุรินทร์" 
            className="w-full h-full object-contain rounded-full" 
          />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
          ระบบจัดการหลังบ้าน
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Jaymart สาขาโรบินสันสุรินทร์</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-zinc-200/40 rounded-3xl border border-zinc-200/80">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-xs font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">รหัสผ่านแอดมิน</label>
              <div>
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 text-sm border border-zinc-300/80 rounded-2xl bg-zinc-50/50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded-full text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 active:scale-98 shadow-md shadow-zinc-900/15 transition-all cursor-pointer"
              >
                {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
