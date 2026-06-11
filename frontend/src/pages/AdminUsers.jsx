import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

export default function AdminUsers() {
  const { onLogout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [passwords, setPasswords] = useState({});
  const [points, setPoints] = useState({});
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [userDevices, setUserDevices] = useState({});
  const [expandedDevices, setExpandedDevices] = useState({});
  const [deletingDeviceId, setDeletingDeviceId] = useState(null);

  const fetchUsers = (search) => {
    apiService.getUsers(search || undefined).then((res) => {
      setUsers(res.users || []);
      const initialPoints = {};
      (res.users || []).forEach((user) => {
        initialPoints[user.id] = user.points ?? 0;
      });
      setPoints(initialPoints);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchUsers(value);
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá người dùng "${userName}"? Hành động này không thể hoàn tác và sẽ xoá tất cả dữ liệu liên quan (tiến trình, lịch sử thanh toán).`)) {
      return;
    }
    setDeletingUserId(userId);
    try {
      await apiService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setToast({ message: `Đã xoá người dùng "${userName}"`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || 'Lỗi khi xoá người dùng.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDeletingUserId(null);
    }
  };

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

  const toggleDevices = async (userId) => {
    if (expandedDevices[userId]) {
      setExpandedDevices((prev) => ({ ...prev, [userId]: false }));
      return;
    }
    setExpandedDevices((prev) => ({ ...prev, [userId]: true }));
    if (!userDevices[userId]) {
      try {
        const res = await apiService.getUserDevices(userId);
        setUserDevices((prev) => ({ ...prev, [userId]: res.devices || [] }));
      } catch (err) {
        setToast({ message: 'Lỗi khi tải danh sách thiết bị.', type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

  const handleDeleteDevice = async (userId, deviceId, deviceName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá thiết bị "${deviceName}"? Người dùng sẽ bị đăng xuất khỏi thiết bị này.`)) {
      return;
    }
    setDeletingDeviceId(deviceId);
    try {
      await apiService.deleteUserDevice(userId, deviceId);
      setUserDevices((prev) => ({
        ...prev,
        [userId]: (prev[userId] || []).filter((d) => d.id !== deviceId),
      }));
      setToast({ message: 'Đã xoá thiết bị thành công.', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || 'Lỗi khi xoá thiết bị.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDeletingDeviceId(null);
    }
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Quản lý người dùng</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/trang-chu"
            className="rounded-2xl bg-slate-100 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            ← Quay lại Trang chủ
          </Link>
          <button
            onClick={onLogout}
            className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600"
          >
            Đăng xuất
          </button>
        </div>
      </div>
      {/* Search bar */}
      <div className="mt-6 mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm người dùng theo tên hoặc email..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div className="mt-6 space-y-6">
        {users.map((u) => (
          <div key={u.id} className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{u.email}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Role: {u.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteUser(u.id, u.name)}
                  disabled={deletingUserId === u.id}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
                >
                  {deletingUserId === u.id ? 'Đang xoá...' : 'Xoá'}
                </button>
                <button onClick={() => setEditingUser(editingUser === u.id ? null : u.id)} className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
                  {editingUser === u.id ? 'Đóng' : 'Chỉnh sửa'}
                </button>
              </div>
            </div>

            {editingUser === u.id && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <input id={`name-${u.id}`} defaultValue={u.name} className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-slate-200" />
                  <select id={`role-${u.id}`} defaultValue={u.role} className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-slate-200">
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
                    className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-slate-200"
                  />
                  <button onClick={() => updatePassword(u.id)} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                    Cập nhật mật khẩu
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-700/50 p-4">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Điểm hiện có</p>
              <div className="mt-4 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Điểm hiện tại của người dùng</p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{u.points ?? 0} điểm</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="number"
                    value={points[u.id] ?? (u.points ?? 0)}
                    onChange={(e) => setPoints((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-900 dark:text-slate-200 sm:w-40"
                  />
                  <button onClick={() => updatePoints(u.id)} className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                    Cập nhật điểm
                  </button>
                </div>
              </div>
            </div>

            {u.role !== 'admin' && (
              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Thiết bị đã đăng nhập</p>
                  <button
                    onClick={() => toggleDevices(u.id)}
                    className="rounded-2xl bg-slate-700 dark:bg-slate-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 dark:hover:bg-slate-500"
                  >
                    {expandedDevices[u.id] ? 'Ẩn' : 'Xem'}
                  </button>
                </div>
                {expandedDevices[u.id] && (
                  <div className="mt-3 space-y-2">
                    {(!userDevices[u.id] || userDevices[u.id].length === 0) && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Không có thiết bị nào.</p>
                    )}
                    {userDevices[u.id]?.map((device) => (
                      <div key={device.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-800 px-4 py-3 shadow-sm">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{device.device_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {device.device_id} &middot; Từ: {new Date(device.created_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteDevice(u.id, device.id, device.device_name)}
                          disabled={deletingDeviceId === device.id}
                          className="rounded-xl bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-600"
                        >
                          {deletingDeviceId === device.id ? 'Đang xoá...' : 'Xoá'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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