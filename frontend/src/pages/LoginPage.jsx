import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { AuthContext } from '../App';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { onLogin } = useContext(AuthContext);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      const response = await apiService.login({ email, password });
      onLogin(response.user || { email });
    } catch (err) {
      setError(err.message);
    }
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

          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Đăng nhập
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
