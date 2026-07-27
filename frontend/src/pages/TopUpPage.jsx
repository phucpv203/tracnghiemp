import { useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';
import { Button, Card, Toast } from '../components/ui';
import { ArrowLeft, SignOut, Coin, ChatTeardropDots } from '@phosphor-icons/react';

const TOPUP_PACKAGES = [
  { points: 50, label: '50 điểm', price: '50,000₫', amount: 50000 },
  { points: 100, label: '100 điểm', price: '100,000₫', amount: 100000 },
  { points: 150, label: '150 điểm', price: '150,000₫', amount: 150000 },
];

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

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const { cancel, code, orderCode } = getPayOSParams();
    if (!orderCode) return;

    if (cancel === 'false' && code === '00') {
      (async () => {
        try {
          const result = await apiService.checkPayment(orderCode);
          if (result.status === 'paid') {
            showToast(`✅ Nạp ${result.points} điểm thành công qua PayOS!`, 'success');
            setTimeout(() => {
              setToast(null);
              window.history.replaceState({}, '', window.location.origin + window.location.pathname + '#/trang-chu');
              navigate('/trang-chu', { replace: true });
            }, 2000);
          } else {
            showToast('Giao dịch đang được xử lý. Vui lòng kiểm tra lại sau.', 'info');
          }
        } catch (err) {
          showToast(err.message || 'Lỗi kiểm tra giao dịch.', 'error');
        }
      })();
    } else if (cancel === 'true') {
      showToast('Bạn đã huỷ giao dịch thanh toán.', 'info');
    }
  }, [navigate]);

  const handleTopUp = async (pkg) => {
    setLoading(true);
    try {
      const result = await apiService.createPayment(pkg.points);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Không nhận được link thanh toán.');
      }
    } catch (error) {
      showToast(error.message || 'Nạp điểm thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Card padding="md" className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Nạp thêm điểm</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Xin chào, {user?.name || user?.email}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Chọn gói điểm để nạp vào tài khoản.
            </p>
            <p className="mt-1 text-sm text-warning-800 dark:text-warning-200">
              NẾU GẶP VẤN ĐỀ KHI NẠP ĐIỂM{' '}
              <Link to="/lien-he" className="inline-flex items-center gap-1 font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition">
                <ChatTeardropDots size={16} weight="fill" />
                LIÊN HỆ ZALO
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/trang-chu')}>
              <ArrowLeft size={16} weight="bold" />
              Quay lại
            </Button>
            <Button variant="primary" size="sm" onClick={onLogout}>
              <SignOut size={16} weight="bold" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {TOPUP_PACKAGES.map((pkg) => (
          <Card key={pkg.points} padding="lg" hover className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-50 dark:bg-warning-900/30">
              <Coin size={32} weight="fill" className="text-warning-600 dark:text-warning-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pkg.label}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Nạp {pkg.points} điểm vào tài khoản</p>
            <p className="mt-1 text-lg font-semibold text-warning-600 dark:text-warning-400">{pkg.price}</p>
            <Button
              variant="warning"
              onClick={() => handleTopUp(pkg)}
              loading={loading}
              className="mt-6 w-full"
            >
              Nạp {pkg.points} điểm
            </Button>
          </Card>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </main>
  );
}