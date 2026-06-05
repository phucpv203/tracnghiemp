import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

export default function AdminUsers() {
  const { onLogout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [passwords, setPasswords] = useState({});
  const [points, setPoints] = useState({});

  useEffect(() => {
    apiService.getUsers().then((res) => {
      setUsers(res.users || []);
      const initialPoints = {};
      (res.users || []).forEach((user) => {
        initialPoints[user.id] = user.points ?? 0;
      });
      setPoints(initialPoints);
    });
  }, []);

  const saveUser = async (id) => {
    const name = document.getElementById(`name-${id}`).value;
    const role = document.getElementById(`role-${id}`).value;
    const data = { name, role };
    const res = await apiService.updateUser(id, data);
    setUsers((s) => s.map((u) => (u.id === id ? { ...u, ...res.user } : u)));
    setEditingUser(null);
  };

  const updatePassword = async (id) => {
    const newPassword = passwords[id];
    if (!newPassword) return;
    await apiService.updateUserPassword(id, newPassword);
    setPasswords((prev) => ({ ...prev, [id]: '' }));
    alert('Mật khẩu người dùng đã được cập nhật.');
  };

  const updatePoints = async (userId) => {
    const pointsValue = Number(points[userId]);
    const res = await apiService.updateUserPoints(userId, pointsValue);
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === userId ? { ...u, points: res.user.points } : u))
    );
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            ← Quay lại User Dashboard
          </Link>
          <button
            onClick={onLogout}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>
      <div className="mt-6 space-y-6">
        {users.map((u) => (
          <div key={u.id} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold">{u.name}</p>
                <p className="text-sm text-slate-600">{u.email}</p>
                <p className="text-sm text-slate-600">Role: {u.role}</p>
              </div>
              <button onClick={() => setEditingUser(editingUser === u.id ? null : u.id)} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                {editingUser === u.id ? 'Đóng' : 'Chỉnh sửa'}
              </button>
            </div>

            {editingUser === u.id && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <input id={`name-${u.id}`} defaultValue={u.name} className="rounded-2xl border border-slate-200 px-4 py-2" />
                  <select id={`role-${u.id}`} defaultValue={u.role} className="rounded-2xl border border-slate-200 px-4 py-2">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <button onClick={() => saveUser(u.id)} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    Lưu thông tin
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    value={passwords[u.id] || ''}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-2"
                  />
                  <button onClick={() => updatePassword(u.id)} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                    Cập nhật mật khẩu
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold">Điểm hiện có</p>
              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-600">Điểm hiện tại của người dùng</p>
                  <p className="text-2xl font-semibold text-slate-900">{u.points ?? 0} điểm</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="number"
                    value={points[u.id] ?? (u.points ?? 0)}
                    onChange={(e) => setPoints((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 sm:w-40"
                  />
                  <button onClick={() => updatePoints(u.id)} className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                    Cập nhật điểm
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
