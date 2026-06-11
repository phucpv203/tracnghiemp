/**
 * TopUpPage - Trang nạp thêm điểm tích hợp PayOS
 *
 * Cơ chế:
 * 1. User chọn gói điểm → gọi API tạo link thanh toán PayOS
 * 2. Redirect user đến cổng thanh toán PayOS
 * 3. Sau khi thanh toán, PayOS redirect về trang này
 * 4. Kiểm tra trạng thái thanh toán và cộng điểm
 */
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

const TOPUP_PACKAGES = [
  { points: 100, label: '100 điểm', price: '100,000₫', amount: 100000 },
  { points: 200, label: '200 điểm', price: '200,000₫', amount: 200000 },
  { points: 300, label: '300 điểm', price: '300,000₫', amount: 300000 },
];

/**
 * Parse query params từ URL (cả trước và sau hash).
 * Với HashRouter, PayOS đặt params ở root URL (?key=val#/path),
 * useSearchParams chỉ đọc params sau hash, nên cần parse thủ công.
 */
function getPayOSParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    cancel: params.get('cancel'),
    code: params.get('code'),
    orderCode: params.get('orderCode'),
    status: params.get('status'),
  };
}

export default function TopUpPage() {
  const { user, onLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Xử lý khi được redirect về từ PayOS
  useEffect(() => {
    // PayOS trả về params ở root URL (trước hash), không phải trong hash route
    // VD: https://domain.com/?cancel=false&code=00&orderCode=123&status=PAID#/topup
    const { cancel, code, orderCode } = getPayOSParams();

    if (!orderCode) return; // Không có params PayOS → bỏ qua

    if (cancel === 'false' && code === '00') {
      // Thanh toán thành công: gọi backend kiểm tra
      (async () => {
        try {
          const result = await apiService.checkPayment(orderCode);
          if (result.status === 'paid') {
            setToast({
              message: `✅ Nạp ${result.points} điểm thành công qua PayOS!`,
              type: 'success',
            });
            setTimeout(() => {
              setToast(null);
              // Xoá params PayOS khỏi URL trước khi chuyển về trang chủ
              window.history.replaceState({}, '', window.location.origin + window.location.pathname + '#/trang-chu');
              navigate('/trang-chu', { replace: true });
            }, 2000);
          } else {
            setToast({ message: 'Giao dịch đang được xử lý. Vui lòng kiểm tra lại sau.', type: 'info' });
            setTimeout(() => setToast(null), 5000);
          }
        } catch (err) {
          setToast({ message: err.message || 'Lỗi kiểm tra giao dịch.', type: 'error' });
          setTimeout(() => setToast(null), 3000);
        }
      })();
    } else if (cancel === 'true') {
      setToast({ message: 'Bạn đã huỷ giao dịch thanh toán.', type: 'info' });
      setTimeout(() => setToast(null), 3000);
    }
  }, [navigate]);

  const handleTopUp = async (pkg) => {
    setLoading(true);
    try {
      const result = await apiService.createPayment(pkg.points);

      // Redirect đến trang thanh toán PayOS
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Không nhận được link thanh toán.');
      }
    } catch (error) {
      setToast({ message: error.message || 'Nạp điểm thất bại.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Nạp thêm điểm</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Xin chào, {user?.name || user?.email}</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Chọn gói điểm để nạp vào tài khoản. <strong>NẾU GẶP VẤN ĐỀ KHI NẠP ĐIỂM LIÊN HỆ ZALO: 0966453217</strong> 
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/trang-chu')}
            className="rounded-2xl bg-slate-100 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            ← Quay lại Trang chủ
          </button>
          <button
            onClick={onLogout}
            className="self-start rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {TOPUP_PACKAGES.map((pkg) => (
          <div
            key={pkg.points}
            className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-sm dark:shadow-slate-700/30 flex flex-col items-center text-center hover:shadow-md transition"
          >
            <div className="mb-4 rounded-full bg-amber-50 dark:bg-amber-900/30 p-4">
              <span className="text-4xl">💰</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pkg.label}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Nạp {pkg.points} điểm vào tài khoản
            </p>
            <p className="mt-1 text-lg font-semibold text-amber-600">{pkg.price}</p>
            <button
              onClick={() => handleTopUp(pkg)}
              disabled={loading}
              className={`mt-6 w-full rounded-2xl px-6 py-3 text-sm font-semibold text-white transition ${
                loading
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {loading ? 'Đang tạo link thanh toán...' : `Nạp ${pkg.points} điểm`}
            </button>
          </div>
        ))}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 shadow-lg text-sm font-semibold transition-all ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : toast.type === 'info'
            ? 'bg-sky-50 border border-sky-200 text-sky-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}