/**
 * TopUpPage - Trang nạp thêm điểm với 3 gói 100, 200, 300
 */
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

const TOPUP_PACKAGES = [
  { points: 100, label: '100 điểm', price: '100' },
  { points: 200, label: '200 điểm', price: '200' },
  { points: 300, label: '300 điểm', price: '300' },
];

export default function TopUpPage() {
  const { user, onLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleTopUp = async (points) => {
    setLoading(true);
    try {
      const result = await apiService.topUp(points);
      setToast({ message: result.message, type: 'success' });
      setTimeout(() => {
        setToast(null);
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      setToast({ message: error.message || 'Nạp điểm thất bại.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Nạp thêm điểm</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Xin chào, {user?.name || user?.email}</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">Chọn gói điểm để nạp vào tài khoản của bạn.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            ← Quay lại Dashboard
          </button>
          <button
            onClick={onLogout}
            className="self-start rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {TOPUP_PACKAGES.map((pkg) => (
          <div
            key={pkg.points}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center text-center hover:shadow-md transition"
          >
            <div className="mb-4 rounded-full bg-amber-50 p-4">
              <span className="text-4xl">💰</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{pkg.label}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Nạp {pkg.points} điểm vào tài khoản
            </p>
            <button
              onClick={() => handleTopUp(pkg.points)}
              disabled={loading}
              className={`mt-6 w-full rounded-2xl px-6 py-3 text-sm font-semibold text-white transition ${
                loading
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {loading ? 'Đang xử lý...' : `Nạp ${pkg.points} điểm`}
            </button>
          </div>
        ))}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 shadow-lg text-sm font-semibold transition-all ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}