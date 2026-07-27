import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';
import { Button, Card, Input, Toast } from '../components/ui';
import { ArrowLeft, SignOut, MagnifyingGlass, Trash, PencilSimple, FloppyDisk, Key, DeviceMobile, EyeSlash, Eye } from '@phosphor-icons/react';

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
  const [searching, setSearching] = useState(false);

  const abortControllerRef = useState(null);

  const fetchUsers = async (search) => {
    setSearching(true);
    try {
      const res = await apiService.getUsers(search || undefined);
      setUsers(res.users || []);
      const initialPoints = {};
      (res.users || []).forEach((user) => { initialPoints[user.id] = user.points ?? 0; });
      setPoints(initialPoints);
    } catch (err) {
      setToast({ message: err.message || 'Lỗi khi tải danh sách người dùng.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setTimeout(() => fetchUsers(value), 300);
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá người dùng "${userName}"? Hành động này không thể hoàn tác.`)) return;
    setDeletingUserId(userId);
    try {
      await apiService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setToast({ message: `Đã xoá người dùng "${userName}"`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || 'Lỗi khi xoá người dùng.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally { setDeletingUserId(null); }
  };

  const saveUser = async (id) => {
    const name = document.getElementById(`name-${id}`).value;
    const role = document.getElementById(`role-${id}`).value;
    const data = { name, role };
    const res = await apiService.updateUser(id, data);
    setUsers((s) => s.map((u) => (u.id === id ? { ...u, ...res.user } : u)));
    setEditingUser(null);
    setToast({ message: 'Đã cập nhật thông tin!', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const updatePassword = async (id) => {
    const newPassword = passwords[id];
    if (!newPassword || newPassword.length < 6) { alert('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    await apiService.updateUserPassword(id, newPassword);
    setPasswords((prev) => ({ ...prev, [id]: '' }));
    setToast({ message: 'Đã cập nhật mật khẩu!', type: 'success' });
    setTimeout(() => setToast(null), 3000);
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
    if (!window.confirm(`Bạn có chắc chắn muốn xoá thiết bị "${deviceName}"?`)) return;
    setDeletingDeviceId(deviceId);
    try {
      await apiService.deleteUserDevice(userId, deviceId);
      setUserDevices((prev) => ({ ...prev, [userId]: (prev[userId] || []).filter((d) => d.id !== deviceId) }));
      setToast({ message: 'Đã xoá thiết bị!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || 'Lỗi khi xoá thiết bị.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally { setDeletingDeviceId(null); }
  };

  const updatePoints = async (userId) => {
    const pointsValue = Number(points[userId]);
    try {
      const res = await apiService.updateUserPoints(userId, pointsValue);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, points: res.user.points } : u)));
      setToast({ message: 'Đã cập nhật điểm!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || 'Lỗi cập nhật điểm.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Quản lý người dùng</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Quản lý tài khoản, điểm số và thiết bị.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin"><Button variant="secondary" size="sm"><ArrowLeft size={16} weight="bold" /> Quay lại Admin</Button></Link>
            <Button variant="primary" size="sm" onClick={onLogout}><SignOut size={16} weight="bold" /> Đăng xuất</Button>
          </div>
        </div>
      </Card>

      <div className="relative max-w-md mb-6">
        <input type="text" placeholder="Tìm kiếm người dùng theo tên hoặc email..." value={searchTerm} onChange={handleSearch}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800" />
        <MagnifyingGlass size={18} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {searching && <p className="mb-4 text-center text-sm text-slate-500">Đang tìm kiếm...</p>}

      {!searching && searchTerm && users.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-slate-500">Không tìm thấy người dùng nào khớp với từ khóa "<strong>{searchTerm}</strong>"</p>
        </Card>
      )}

      <div className="space-y-6">
        {users.map((u) => (
          <Card key={u.id} padding="md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{u.email} · Role: {u.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="danger" onClick={() => handleDeleteUser(u.id, u.name)} loading={deletingUserId === u.id}>
                  <Trash size={14} weight="bold" /> Xoá
                </Button>
                <Button size="sm" variant="primary" onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}>
                  <PencilSimple size={14} weight="bold" /> {editingUser === u.id ? 'Đóng' : 'Chỉnh sửa'}
                </Button>
              </div>
            </div>

            {editingUser === u.id && (
              <div className="mt-5 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <input id={`name-${u.id}`} defaultValue={u.name} className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm text-slate-900 dark:text-slate-200" />
                  <select id={`role-${u.id}`} defaultValue={u.role} className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <Button size="sm" variant="success" onClick={() => saveUser(u.id)}><FloppyDisk size={14} weight="bold" /> Lưu</Button>
                </div>
                <div className="flex gap-3 items-center">
                  <input type="password" placeholder="Mật khẩu mới (6+ ký tự)" value={passwords[u.id] || ''}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm" />
                  <Button size="sm" variant="primary" onClick={() => updatePassword(u.id)}><Key size={14} weight="bold" /> Cập nhật MK</Button>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 p-4">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Điểm hiện có</p>
              <div className="sm:flex sm:items-center sm:justify-between gap-4">
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{u.points ?? 0} điểm</p>
                <div className="flex gap-3 mt-3 sm:mt-0">
                  <input type="number" value={points[u.id] ?? (u.points ?? 0)}
                    onChange={(e) => setPoints((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="w-full sm:w-40 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm" />
                  <Button size="sm" variant="warning" onClick={() => updatePoints(u.id)}>Cập nhật điểm</Button>
                </div>
              </div>
            </div>

            {u.role !== 'admin' && (
              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1"><DeviceMobile size={16} weight="bold" /> Thiết bị đã đăng nhập</p>
                  <Button size="sm" variant="secondary" onClick={() => toggleDevices(u.id)}>
                    {expandedDevices[u.id] ? 'Ẩn' : 'Xem'}
                  </Button>
                </div>
                {expandedDevices[u.id] && (
                  <div className="space-y-2">
                    {(!userDevices[u.id] || userDevices[u.id].length === 0) && <p className="text-sm text-slate-500">Không có thiết bị nào.</p>}
                    {userDevices[u.id]?.map((device) => (
                      <div key={device.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-800 px-4 py-3 shadow-sm">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{device.device_name}</p>
                          <p className="text-xs text-slate-500">ID: {device.device_id} · Từ: {new Date(device.created_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteDevice(u.id, device.id, device.device_name)} loading={deletingDeviceId === device.id}>
                          <Trash size={14} weight="bold" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </main>
  );
}