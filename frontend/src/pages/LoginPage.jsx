import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { deviceService } from '../services/deviceService';
import { AuthContext } from '../App';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceConflict, setDeviceConflict] = useState(null); // { existingDevice: { deviceName, deviceId }, email, password }
  const [replacing, setReplacing] = useState(false);
  const { onLogin } = useContext(AuthContext);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const deviceId = deviceService.getDeviceId();
    const deviceName = deviceService.getDeviceName();

    try {
      const response = await apiService.login({ email, password, deviceId, deviceName });
      onLogin(response.user, response.token);
    } catch (err) {
      // Kiểm tra nếu là lỗi DEVICE_CONFLICT (status 409)
      if (err.message && err.message.includes('Tài khoản đang được dùng trên')) {
        setDeviceConflict({ existingDevice: { deviceName: extractDeviceName(err.message) }, email, password });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Hàm parse tên thiết bị từ message "Tài khoản đang được dùng trên "Chrome trên Windows"...."
  function extractDeviceName(message) {
    const match = message.match(/đang được dùng trên "([^"]+)"/);
    return match ? match[1] : 'thiết bị khác';
  }

  const handleReplaceDevice = async () => {
    if (!deviceConflict) return;
    setReplacing(true);
    setError('');

    const deviceId = deviceService.getDeviceId();
    const deviceName = deviceService.getDeviceName();

    try {
      const response = await apiService.replaceDevice({
        email: deviceConflict.email,
        password: deviceConflict.password,
        deviceId,
        deviceName,
      });
      setDeviceConflict(null);
      onLogin(response.user, response.token);
    } catch (err) {
      setError(err.message);
      setDeviceConflict(null);
    } finally {
      setReplacing(false);
    }
  };

  const handleCancelReplace = () => {
    setDeviceConflict(null);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl bg-white p-8 shadow-xl sm:p-10">
        <h1 className="text-3xl font-semibold text-slate-900">Đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600">Đăng nhập để tiếp tục ôn thi trắc nghiệm.</p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          {/* Dialog xác nhận thay thế thiết bị */}
          {deviceConflict && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Xung đột thiết bị</p>
              <p className="text-sm text-amber-700">
                Tài khoản đang được dùng trên <strong>"{deviceConflict.existingDevice.deviceName}"</strong>.
                Bạn có muốn xóa thiết bị đó để đăng nhập trên máy này không?
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleReplaceDevice}
                  disabled={replacing}
                  className="flex-1 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-300"
                >
                  {replacing ? 'Đang xử lý...' : 'Xác nhận & Đăng nhập'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelReplace}
                  disabled={replacing}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!deviceConflict}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-slate-900 hover:text-slate-700">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}